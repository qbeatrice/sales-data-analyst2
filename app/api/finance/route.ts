// app/api/finance/route.ts
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ChartData } from "@/types/chart";
import { executeNaturalLanguageQuery, prepareDataForVisualization } from "@/lib/database-service";

// Initialize Anthropic client with correct headers
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const runtime = 'nodejs'; 

// Helper to validate base64
const isValidBase64 = (str: string) => {
  try {
    return btoa(atob(str)) === str;
  } catch (err) {
    return false;
  }
};

// Add Type Definitions
interface ChartToolResponse extends ChartData {
  // Any additional properties specific to the tool response
}

interface ToolSchema {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

const tools: ToolSchema[] = [
  {
    name: "generate_graph_data",
    description:
      "Generate structured JSON data for creating sales charts and graphs.",
    input_schema: {
      type: "object",
      properties: {
        chartType: {
          type: "string",
          enum: ["line", "bar", "pie", "multibar"],
          description: "The type of chart to generate",
        },
        data: {
          type: "array",
          description: "The data to visualize",
        },
        config: {
          type: "object",
          description: "Configuration options for the chart",
        },
        chartConfig: {
          type: "object",
          description: "Configuration for individual series in the chart",
        },
      },
      required: ["chartType", "data", "config", "chartConfig"],
    },
  },
  {
    name: "query_sales_data",
    description: "Query the database to retrieve sales data",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Natural language description of the data to retrieve",
        },
        sql: {
          type: "string",
          description: "SQL query to execute (not shown to user)",
        },
        params: {
          type: "array",
          description: "Parameters for the SQL query (not shown to user)",
          items: {
            type: "string"
          }
        }
      },
      required: ["query", "sql"],
    },
  },
];

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      fileData,
      model = "claude-3-haiku-20240307",
    } = await req.json();

    console.log("🔍 Initial Request Data:", {
      hasMessages: !!messages,
      messageCount: messages?.length,
      hasFileData: !!fileData,
      fileType: fileData?.mediaType,
      model,
    });

    // Input validation
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400 },
      );
    }

    if (!model) {
      return new Response(
        JSON.stringify({ error: "Model selection is required" }),
        { status: 400 },
      );
    }

    // Convert all previous messages
    let anthropicMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Handle file in the latest message
    if (fileData) {
      const { base64, mediaType, isText, fileName } = fileData;

      if (!base64) {
        console.error("❌ No base64 data received");
        return new Response(JSON.stringify({ error: "No file data" }), {
          status: 400,
        });
      }

      try {
        if (isText) {
          // Decode base64 text content
          const textContent = decodeURIComponent(escape(atob(base64)));

          // Replace only the last message with the file content
          anthropicMessages[anthropicMessages.length - 1] = {
            role: "user",
            content: [
              {
                type: "text",
                text: `File contents of ${fileName}:\n\n${textContent}`,
              },
              {
                type: "text",
                text: messages[messages.length - 1].content,
              },
            ],
          };
        } else if (mediaType.startsWith("image/")) {
          // Handle image files
          anthropicMessages[anthropicMessages.length - 1] = {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: "text",
                text: messages[messages.length - 1].content,
              },
            ],
          };
        }
      } catch (error) {
        console.error("Error processing file content:", error);
        return new Response(
          JSON.stringify({ error: "Failed to process file content" }),
          { status: 400 },
        );
      }
    }

    console.log("🚀 Final Anthropic API Request:", {
      endpoint: "messages.create",
      model,
      max_tokens: 4096,
      temperature: 0.7,
      messageCount: anthropicMessages.length,
      tools: tools.map((t) => t.name),
      messageStructure: JSON.stringify(
        anthropicMessages.map((msg) => ({
          role: msg.role,
          content:
            typeof msg.content === "string"
              ? msg.content.slice(0, 50) + "..."
              : "[Complex Content]",
        })),
        null,
        2,
      ),
    });

    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      temperature: 0.7,
      tools: tools,
      tool_choice: { type: "auto" },
      messages: anthropicMessages,
      system: `You are Claude, a helpful sales data analyst assistant. 
You have access to the following tools:

1. generate_graph_data: Generate visualization data for sales analysis
2. query_sales_data: Query the database to retrieve sales data

You have access to the following tables:
1. sales_data - Contains sales transaction information with the following columns:
   - key: Unique identifier of the transaction (int)
   - country: Country of the store (nvarchar)
   - region: Region of the store (nvarchar)
   - city: City of the store (nvarchar)
   - store_id: Unique identifier of the store (int)
   - store_name: Name of the store (nvarchar)
   - sales_order_number: Sales order unique identifier (nvarchar)
   - sales_date: Date of the sales order (date)
   - product_name: Name of the product sold (nvarchar)
   - quantity: Quantity of the product sold (int)
   - unit_price: Price of the product (decimal)
   - total_product_cost: Total cost of the product (decimal)
   - material_cost: Cost of the materials used to make the product (decimal)
   - shipping_cost: Cost of shipping the product (decimal)
   - total_cost: Total cost of the product (decimal)
   - sales_type: Type of sales (instore or delivery) (nvarchar)
   - delivery_fee: Fee for the delivery of the product (decimal)
   - delivery_duration_mins: Amount of time it took to deliver the product (int, nullable)
   - discount_code: Code of the discount applied to the product (nvarchar, nullable)
   - discount_percent: Percentage of discount applied to the product (int, nullable)
   - delivery_plate: Plate number of the delivery vehicle (nvarchar, nullable)

2. product_design (unique_products_with_materials_masterlist) - Contains information about products and materials:
   - Country: Country where the product is produced and sold (nvarchar)
   - Region: Region where the product is produced and sold (nvarchar)
   - City: City where the product is produced and sold (nvarchar)
   - Product_Name: Name of the product (nvarchar)
   - Product_Price: Selling price of the product (decimal, nullable)
   - Material_Code: Code of the material used to make the product (nvarchar)
   - Material_Quantity: Quantity of the material used to make the product (int, nullable)
   - Material_Unit_Cost: Unit cost of the material used to make the product (decimal, nullable)
   - Material_Shipping_Cost: Shipping cost of the material used to make the product (decimal, nullable)
   - total_material_cost: Total cost of the material used to make the product (decimal, nullable)
   - total_material_shipping_cost: Total shipping cost of the material used to make the product (decimal, nullable)

3. vehicle_master - Contains information about delivery vehicles:
   - Country: Country where the vehicle is used (nvarchar)
   - Region: Region where the vehicle is used (nvarchar)
   - City: City where the vehicle is used (nvarchar)
   - Vehicle_Plate: Plate number of the vehicle used to deliver the product (nvarchar)

When users asks for a visualization, write the appropriate SQL query to get the data needed from the defined tables. Use the query_sales_data tool to retrieve the relevant information from the database. Don't mention that you're using SQL or show any SQL code to the user.
When user asks about the data, write the appropriate SQL query to get the data needed from the defined tables. Use the query_sales_data tool to retrieve the relevant information from the database. Then provide the answer based on the data.


After retrieving the data, analyze it and use the generate_graph_data tool to create visualizations when appropriate, especially for:
- Time-based trends
- Comparisons between categories
- Distribution analysis
- Performance metrics

Focus on providing clear, actionable insights from the data. When creating visualizations, choose the most appropriate chart type:
- Line charts for trends over time
- Bar charts for comparing categories
- Pie charts for showing distribution
- Multi-bar charts for comparing multiple metrics across categories

Add colors and tooltips if it will provide more information to the user.


Always provide context and explanations for any data or visualizations you present. Don't just provide raw numbers - explain what they mean in business terms.`,
    });

    // Handle the case where the bot used the query_sales_data tool
    let toolUseContent = null;
    let chartData = null;
    let dataQueryIndex = -1;
    let textContent = response.content.find((c) => c.type === "text");

    // Find if there was a data query in the response
    for (let i = 0; i < response.content.length; i++) {
      const content = response.content[i];
      if (content.type === 'tool_use' && content.name === 'query_sales_data') {
        dataQueryIndex = i;
        break;
      }
    }

    // Process data query if it exists
    if (dataQueryIndex >= 0) {
      const dataQueryTool = response.content[dataQueryIndex] as any;
      const nlQuery = dataQueryTool.input.query;
      const sqlQuery = dataQueryTool.input.sql; // Get the SQL query directly from the bot
      const sqlParams = dataQueryTool.input.params || []; // Get parameters if provided
      
      console.log("Executing query:", nlQuery);
      console.log("SQL:", sqlQuery);
      
      // Execute the SQL query directly
      const queryResult = await executeNaturalLanguageQuery({
        query: nlQuery,
        sql: sqlQuery,
        params: sqlParams
      });
      
      if (queryResult.success && queryResult.data && queryResult.data.length > 0) {
        console.log(`Query returned ${queryResult.data.length} rows`);
        
        // Prepare data for visualization
        chartData = prepareDataForVisualization(queryResult.data, nlQuery);
        
        // If chart data was generated, find or create a generate_graph_data tool use
        let graphToolIndex = -1;
        
        // Look for existing graph tool use
        for (let i = 0; i < response.content.length; i++) {
          const content = response.content[i];
          if (content.type === 'tool_use' && content.name === 'generate_graph_data') {
            graphToolIndex = i;
            break;
          }
        }
        
        // If generate_graph_data tool was used, replace its content
        if (graphToolIndex >= 0) {
          toolUseContent = response.content[graphToolIndex];
          // Overwrite the tool's input with our chart data
          (toolUseContent as any).input = chartData;
        } else if (chartData) {
          // If no graph tool was used but we have chart data, create a synthetic tool use
          toolUseContent = {
            id: `tu_${Math.random().toString(36).substring(2, 9)}`,
            type: 'tool_use',
            name: 'generate_graph_data',
            input: chartData
          };
        }
      } else {
        console.log("Query returned no data or failed:", queryResult);
      }
    } else {
      // If only generate_graph_data was used, get that content
      for (const content of response.content) {
        if (content.type === 'tool_use' && content.name === 'generate_graph_data') {
          toolUseContent = content;
          break;
        }
      }
    }

    // Process the chart data for visualization
    const processToolResponse = (toolUseContent: any) => {
      if (!toolUseContent || toolUseContent.name !== 'generate_graph_data') return null;
      
      const chartData = toolUseContent.input;
      
      // For pie charts, transform data for the UI components
      if (chartData.chartType === 'pie') {
        // Look for pie chart specific transformations
        const valueKey = Object.keys(chartData.data[0]).find(k => k !== chartData.config.xAxisKey);
        
        if (valueKey && chartData.config.xAxisKey) {
          chartData.data = chartData.data.map(item => {
            return {
              segment: item[chartData.config.xAxisKey],
              value: item[valueKey] || item.value,
            };
          });
          
          // Ensure xAxisKey is set to 'segment' for consistency
          chartData.config.xAxisKey = "segment";
        }
      }

      // Create new chartConfig with system color variables
      const processedChartConfig = Object.entries(chartData.chartConfig).reduce(
        (acc, [key, config], index) => ({
          ...acc,
          [key]: {
            ...config,
            // Assign color variables sequentially
            color: `hsl(var(--chart-${index + 1}))`,
          },
        }),
        {},
      );

      return {
        ...chartData,
        chartConfig: processedChartConfig,
      };
    };

    const processedChartData = toolUseContent
      ? processToolResponse(toolUseContent)
      : null;

    return new Response(
      JSON.stringify({
        content: textContent?.text || "",
        hasToolUse: response.content.some((c) => c.type === "tool_use"),
        toolUse: toolUseContent,
        chartData: processedChartData,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      },
    );
  } catch (error) {
    console.error("❌ Sales Data API Error: ", error);
    console.error("Full error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      headers: error instanceof Error ? (error as any).headers : undefined,
      response: error instanceof Error ? (error as any).response : undefined,
    });

    // Add specific error handling for different scenarios
    if (error instanceof Anthropic.AuthenticationError) {
      return new Response(
        JSON.stringify({
          error: "Authentication Error",
          details: "Invalid API key or authentication failed",
        }),
        { status: 401 },
      );
    }

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "An unknown error occurred",
      }),
      { status: 500 },
    );
  }
}