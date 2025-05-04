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

// Add this function to check if Claude's response contains an explanation
function needsDataExplanation(responseText, queryData) {
  // If there's no data or no text response, we can't analyze
  if (!queryData || !queryData.length || !responseText) {
    return false;
  }
  
  // Check if response contains numeric values from the data
  const hasDataValues = queryData.some(row => {
    // Get all numeric values from this row
    const numericValues = Object.values(row).filter(val => 
      typeof val === 'number' || 
      (typeof val === 'string' && !isNaN(parseFloat(val)))
    );
    
    // Convert to strings for easier matching
    const stringValues = numericValues.map(v => String(v));
    
    // Check if any of these values appear in the response
    return stringValues.some(strVal => responseText.includes(strVal));
  });
  
  // If Claude's response doesn't reference any values from the data,
  // it probably didn't explain the result
  return !hasDataValues;
}

// Add this function to generate a follow-up explanation when needed
async function getDataExplanation(originalResponse, queryData, nlQuery) {
  try {
    console.log("Generating data explanation for query:", nlQuery);
    
    // Create a sample of the data to include in the prompt
    const dataSample = JSON.stringify(
      queryData.length > 5 ? queryData.slice(0, 5) : queryData, 
      null, 
      2
    );
    
    // Create a follow-up message to Claude
    const followUpMessage = {
      model: "claude-3-haiku-20240307", // Use a faster model for this follow-up
      max_tokens: 1000,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: `I asked: "${nlQuery}"
          
You ran a database query and got these results:
\`\`\`
${dataSample}${queryData.length > 5 ? `\n... and ${queryData.length - 5} more rows` : ''}
\`\`\`

Please provide a direct answer to my question in 1-3 sentences based on this data. Include specific numbers from the data in your answer. Don't mention that you're looking at query results - just answer my question directly.`
        }
      ],
      system: "You are a helpful data analyst assistant. Your task is to provide direct, factual answers based on database query results. Keep your answers concise (1-3 sentences) and focus on directly answering the question with specific numbers from the data."
    };
    
    // Make a direct call to the Anthropic API
    const explanationResponse = await anthropic.messages.create(followUpMessage);
    
    // Get the explanation text
    const explanation = explanationResponse.content[0].text;
    console.log("Generated explanation:", explanation);
    
    // Combine the explanation with the original response
    return  originalResponse + "\n\n" + explanation;
  } catch (error) {
    console.error("Error generating explanation:", error);
    return originalResponse; // Return original response if explanation fails
  }
}


//function to check and log tool usage
function logToolUsage(response) {
  console.log("\n===== CLAUDE TOOL USAGE =====");
  
  // Check for tool uses in the response
  const toolUses = response.content.filter(item => item.type === 'tool_use');
  
  if (toolUses.length === 0) {
    console.log("🔴 No tools were used by Claude in this response");
    return;
  }
  
  // Log each tool use
  toolUses.forEach((tool, index) => {
    console.log(`\n🔧 Tool Use #${index + 1}: ${tool.name}`);
    
    if (tool.name === 'generate_graph_data') {
      console.log("📊 VISUALIZATION TOOL DETECTED!");
      console.log("Chart Type:", tool.input.chartType);
      console.log("Config:", JSON.stringify(tool.input.config, null, 2));
      
      // Log a sample of the data (first 2 items)
      if (tool.input.data && tool.input.data.length > 0) {
        console.log(`Data Sample (${tool.input.data.length} items total):`);
        console.log(JSON.stringify(tool.input.data.slice(0, 2), null, 2));
      } else {
        console.log("No data provided for visualization");
      }
    } else if (tool.name === 'query_sales_data') {
      console.log("🔍 QUERY TOOL DETECTED!");
      console.log("Natural Language Query:", tool.input.query);
      console.log("SQL Query:", tool.input.sql);
      if (tool.input.params) {
        console.log("Query Parameters:", tool.input.params);
      }
    } else {
      console.log("Input:", JSON.stringify(tool.input, null, 2));
    }
  });
  
  console.log("\n===== END TOOL USAGE =====\n");
}

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

    // Add to system prompt that Claude should clear previous charts
    const systemPrompt = `You are Claude, a helpful sales data analyst assistant. 
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

When user asks for a visualization, follow these steps and guidelines:
1.Write the appropriate SQL query to get the data needed from the defined tables. 
2. Use the query_sales_data tool to retrieve the relevant information from the database. Don't mention that you're using SQL or show any SQL code to the user.
3. After retrieving the data, analyze it and use the generate_graph_data tool to create visualizations when appropriate, especially for:
- Time-based trends
- Comparisons between categories
- Distribution analysis
- Performance metrics
Focus on providing clear, actionable insights from the data. When creating visualizations, choose the most appropriate chart type:
- Line charts for trends over time
- Bar charts for comparing categories
- Pie charts for showing distribution
- Multi-bar charts for comparing multiple metrics across categories
IMPORTANT: Whenever you need to show a chart or visualization, you should REPLACE any previous chart with your new one. Do not add multiple charts. Use ONLY ONE generate_graph_data tool call in your response, and make it comprehensive.

4. Follow up with context and explanations for any data or visualizations you present. Don't just provide raw numbers - explain what they mean in business terms.

When user asks a question about the data without requesting a visualization, follow these steps:
1. write the appropriate SQL query to get the data needed from the defined tables. Use the query_sales_data tool to retrieve the relevant information from the database. 
2. Check if there is a need for visualization.
2. Respond to the user's question based on the data retrieved from the database in plain text.
    Example question: What is the worst performing product?
    Example response: The worst performing product is the "Product B" with a total sales of $10,000.
3. If the query returns fewer than 5 rows, simply format the answer as text with the actual values.
    Example: "The top 3 products by sales are: Electronics ($45,000), Furniture ($32,000), and Clothing ($28,000)."
4. If the query returns more than 5 rows, create a visualization and summarize the key findings.
Remember to use business-friendly language that focuses on insights rather than technical details of the data retrieval.

IMPORTANT: Your primary job is to answer the user's question clearly and directly. Visualizations are supplementary tools to help illustrate complex data, not replacements for clear text answers.

IMPORTANT - SQL QUERY GUIDELINES:
When writing SQL queries for the database, follow these strict rules for Azure SQL Server compatibility:

1. NEVER use LIMIT clause - Use TOP instead:
   - Incorrect: SELECT * FROM sales_data LIMIT 10
   - Correct: SELECT TOP 10 * FROM sales_data

2. NEVER use || for string concatenation - Use + instead:
   - Incorrect: SELECT 'Product: ' || product_name FROM sales_data
   - Correct: SELECT 'Product: ' + product_name FROM sales_data

3. NEVER use IFNULL or COALESCE - Use ISNULL instead:
   - Incorrect: SELECT IFNULL(discount_code, 'No Discount') FROM sales_data
   - Incorrect: SELECT COALESCE(discount_code, 'No Discount') FROM sales_data
   - Correct: SELECT ISNULL(discount_code, 'No Discount') FROM sales_data

4. Date functions must follow SQL Server syntax:
   - For current date: GETDATE() or CURRENT_TIMESTAMP
   - For extracting year: YEAR(sales_date)
   - For extracting month: MONTH(sales_date)
   - For date formatting: FORMAT(sales_date, 'yyyy-MM-dd')

5. For pagination, use:
   - Incorrect: SELECT * FROM sales_data LIMIT 10 OFFSET 20
   - Correct: SELECT * FROM sales_data ORDER BY key OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY

6. Always use square brackets [] for column or table names that are reserved keywords:
   - Correct: SELECT [key], [order], [date] FROM [table]

Remember that the database is Azure SQL Server (Microsoft SQL Server), not MySQL, PostgreSQL or SQLite.

QUERY ANSWER REQUIREMENTS:
After using the query_sales_data tool to retrieve information, you MUST ALWAYS do the following:

1. IMMEDIATELY provide a direct, explicit answer to the user's question based on the query results.
   - BAD: "I've run a query to look at sales in Queensland."
   - GOOD: "The total sales in Queensland amount to $1,245,387."

2. For single numbers or small result sets (1-3 items), format the answer as plain text:
   - For single values: "Total revenue for Q3 was $1.2 million."
   - For small lists: "Your top 3 products by revenue are Electronics ($450K), Furniture ($380K), and Clothing ($320K)."

3. NEVER wait for the user to ask a follow-up question before providing the answer to their original question.

4. When providing simple factual answers, use this structure:
   a) Direct answer with the specific value(s) requested
   b) Brief context if relevant (e.g., "This represents a 5% increase from last quarter")
   c) Additional insights if obvious from the data

5. For more complex queries where you do provide a visualization, still begin with a text summary of the key findings before referencing the chart.

Remember: Your PRIMARY responsibility is to directly answer the user's question in text form. Visualizations are secondary and should complement, not replace, your answer.
`;

    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      temperature: 0.7,
      tools: tools,
      tool_choice: { type: "auto" },
      messages: anthropicMessages,
      system: systemPrompt,
    });

    // Add this line to log tool usage
    logToolUsage(response);

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
    // Replace the existing logic for creating visualizations with this more selective approach

    // Process data query if it exists
    if (dataQueryIndex >= 0) {
      const dataQueryTool = response.content[dataQueryIndex] as any;
      const nlQuery = dataQueryTool.input.query;
      const sqlQuery = dataQueryTool.input.sql;
      const sqlParams = dataQueryTool.input.params || [];
      
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
        const queryData = queryResult.data;
    
        // Get the text content from Claude's response
        let textResponse = textContent?.text || "";
        
        // Check if Claude's response needs explanation
        if (needsDataExplanation(textResponse, queryData)) {
          console.log("Claude's response doesn't explain the data, generating explanation...");
          
          // Generate an explanation
          textResponse = await getDataExplanation(textResponse, queryData, nlQuery);
          
          // Update the text content
          if (textContent) {
            textContent.text = textResponse;
          }
        }
        // Check if Claude explicitly requested a chart
        let userWantsChart = false;
        let graphToolIndex = -1;
        
        // Look for existing graph tool use
        for (let i = 0; i < response.content.length; i++) {
          const content = response.content[i];
          if (content.type === 'tool_use' && content.name === 'generate_graph_data') {
            graphToolIndex = i;
            userWantsChart = true;
            break;
          }
        }

        // Complete replacement for the shouldCreateVisualization function

        const shouldCreateVisualization = (data, query) => {
          // Normalize the query text for consistent checks
          const normalizedQuery = query.toLowerCase().trim();
          
          // Log the exact query we're checking
          console.log("Checking visualization decision for query:", normalizedQuery);
          
          // If Claude explicitly asked for visualization, always provide it
          if (userWantsChart) {
            console.log("Visualization triggered by explicit tool usage");
            return true;
          }
          
          // FIXED: Direct check for common visualization request phrases
          if (normalizedQuery.startsWith('show') || 
              normalizedQuery.startsWith('display') || 
              normalizedQuery.includes('show me') || 
              normalizedQuery.includes('visual')) {
            console.log("Direct visualization request detected in query");
            return true;
          }
          
          // Check for other explicit visualization keywords
          const vizKeywords = ['compare', 'trend', 'distribution', 'chart', 'graph'];
          for (const keyword of vizKeywords) {
            if (normalizedQuery.includes(keyword)) {
              console.log(`Visualization keyword '${keyword}' found in query`);
              return true;
            }
          }
          
          // Look for "by [category]" patterns which indicate grouping
          if (normalizedQuery.includes(' by ')) {
            // Check if query contains metrics followed by "by" and a category
            const metricTerms = ['sales', 'revenue', 'profit', 'products', 'performance', 'data', 'count', 'total', 'amount'];
            const categoryTerms = ['region', 'country', 'city', 'product', 'category', 'month', 'year', 'quarter', 'date', 'day', 'type'];
            
            // Check for "[metric] by [category]" pattern
            let foundMetric = false;
            let foundCategory = false;
            
            for (const metric of metricTerms) {
              if (normalizedQuery.includes(metric)) {
                foundMetric = true;
                break;
              }
            }
            
            for (const category of categoryTerms) {
              if (normalizedQuery.includes(` by ${category}`)) {
                foundCategory = true;
                break;
              }
            }
            
            if (foundMetric && foundCategory && data.length > 1) {
              console.log("Visualization triggered by '[metric] by [category]' pattern");
              return true;
            }
          }
          
          // Check for comparison or ranking terms that benefit from visualization
          const comparisonKeywords = ['top', 'bottom', 'highest', 'lowest', 'most', 'least', 'compare', 'comparison', 'versus', 'vs'];
          
          // Find if there's a comparison keyword in the query
          let comparisonFound = false;
          let matchedKeyword = '';
          
          for (const keyword of comparisonKeywords) {
            if (normalizedQuery.includes(keyword)) {
              comparisonFound = true;
              matchedKeyword = keyword;
              break;
            }
          }
          
          if (comparisonFound) {
            // Check if there's a number associated with the comparison keyword
            // and if that number is greater than 3
            const matches = normalizedQuery.match(/\b(top|bottom|highest|lowest|most|least)\s+(\d+)\b/i);
            
            if (matches && matches.length >= 3) {
              const number = parseInt(matches[2], 10);
              if (number > 3) {
                console.log(`Visualization triggered by comparison term with number > 3: ${matches[0]}`);
                return true;
              } else {
                console.log(`Comparison term found with number <= 3: ${matches[0]} - skipping visualization`);
                return false;
              }
            } else if (data.length > 3) {
              // If no specific number is mentioned but we have more than 3 data points,
              // still create a visualization
              console.log(`Comparison term '${matchedKeyword}' found with no specific number, but data has > 3 rows`);
              return true;
            } else {
              console.log(`Comparison term '${matchedKeyword}' found with no specific number and data has <= 3 rows - skipping visualization`);
              return false;
            }
          }
          
          // Only visualize larger datasets automatically if no explicit terms were matched
          if (data.length <= 3) {
            console.log("Skipping visualization - result set too small (≤ 3 rows)");
            return false;
          }
          
          // Check if this is time-based data (likely needs a trend line)
          const hasDateColumn = Object.keys(data[0]).some(key => 
            key.toLowerCase().includes('date') || 
            key.toLowerCase().includes('time') ||
            key.toLowerCase().includes('month') ||
            key.toLowerCase().includes('year')
          );
          
          if (hasDateColumn && data.length > 3) {
            console.log("Visualization triggered by time-based data with multiple points");
            return true;
          }
          
          // Check if this is categorical data with many categories (good for comparison)
          if (data.length > 3) {
            // Look for columns that might be categories
            const possibleCategoryColumns = Object.keys(data[0]).filter(key => 
              key.toLowerCase().includes('type') ||
              key.toLowerCase().includes('category') ||
              key.toLowerCase().includes('region') ||
              key.toLowerCase().includes('country') ||
              key.toLowerCase().includes('city') ||
              key.toLowerCase().includes('product') ||
              key.toLowerCase().includes('name')
            );
            
            if (possibleCategoryColumns.length > 0) {
              console.log("Visualization triggered by categorical data with multiple categories");
              return true;
            }
          }
          
          // Check if there are multiple numeric columns (good for multibar charts)
          const numericColumns = Object.keys(data[0]).filter(key => {
            const value = data[0][key];
            return typeof value === 'number' || !isNaN(parseFloat(value));
          });
          
          if (numericColumns.length > 1 && data.length > 3) {
            console.log("Visualization triggered by multiple numeric columns");
            return true;
          }
          
          console.log("No visualization criteria matched - defaulting to no chart");
          return false;
        };
        
        // Decide if we need a visualization
        const needsVisualization = shouldCreateVisualization(queryResult.data, nlQuery);
        console.log(`Query results visualization decision: ${needsVisualization ? 'Creating chart' : 'No chart needed'}`);
        
        if (needsVisualization) {
          // Prepare data for visualization
          chartData = prepareDataForVisualization(queryResult.data, nlQuery);
          
          // If generate_graph_data tool was used, replace its content
          if (graphToolIndex >= 0) {
            toolUseContent = response.content[graphToolIndex];
            // Overwrite the tool's input with our chart data
            (toolUseContent as any).input = chartData;
          } else if (chartData) {
            // Create a synthetic tool use only if needed
            console.log("Creating SYNTHETIC visualization because one is needed but Claude didn't create it");
            toolUseContent = {
              id: `tu_${Math.random().toString(36).substring(2, 9)}`,
              type: 'tool_use',
              name: 'generate_graph_data',
              input: chartData
            };
          }
        } else {
          console.log("Skipping visualization for this query - not appropriate for a chart");
        }
      } else {
        console.log("Query returned no data or failed:", queryResult);
      }
    } else {
      // If only generate_graph_data was used, get ONLY the LAST one
      for (let i = response.content.length - 1; i >= 0; i--) {
        const content = response.content[i];
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
        hasToolUse: response.content.some((c) => c.type === "tool_use") || !!toolUseContent,
        toolUse: toolUseContent,
        chartData: processedChartData,
        replaceChart: true,
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