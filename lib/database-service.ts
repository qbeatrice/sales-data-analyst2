// /lib/database-service.ts
import { query as executeQuery } from './db';

// Function to convert query results to a CSV string format
export function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        // Handle values that might contain commas
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',')
    )
  ];
  
  return csvRows.join('\n');
}

// Function to execute a SQL query and return formatted results
export async function executeNaturalLanguageQuery(queryData: { query?: string, sql?: string, params?: any[] }) {
  try {
    // Use the SQL query directly passed from the bot
    const sql = queryData.sql || '';
    const params = queryData.params || [];
    
    if (!sql) {
      return {
        success: false,
        error: 'No SQL query provided',
        explanation: 'Failed to generate SQL query'
      };
    }

    console.log('Executing SQL query:', sql);
    console.log('With parameters:', params);

    // Execute the SQL query
    const result = await executeQuery(sql, params);
    
    // Generate a simple explanation based on the query
    let explanation = 'This query retrieves data from the database';
    
    if (sql.toLowerCase().includes('group by')) {
      explanation = 'This query aggregates data from the database';
    }
    
    if (sql.toLowerCase().includes('order by')) {
      explanation += ' and sorts the results';
    }
    
    return {
      success: true,
      data: result.recordset || [],
      rowCount: result.recordset?.length || 0,
      explanation,
      sql // Only for debugging, not shown to user
    };
  } catch (error) {
    console.error('Error executing query:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      explanation: 'An error occurred while executing your query.'
    };
  }
}

// Function to convert SQL results to data suitable for visualization
export function prepareDataForVisualization(results: any[], nlQuery: string): any {
  if (!results || results.length === 0) {
    return null;
  }

  try {
    // Determine appropriate chart type based on data and query
    const queryLower = nlQuery.toLowerCase();
    
    // Default structure for chart data
    let chartData = {
      chartType: 'bar',
      data: [],
      config: {
        xAxisKey: '',
        title: 'Sales Data Analysis',
        description: 'Analysis based on your query'
      },
      chartConfig: {}
    };

    // Extract column names
    const columns = Object.keys(results[0]);
    
    // Check for time-based columns (for trends)
    const timeColumns = columns.filter(col => 
      col.toLowerCase().includes('date') || 
      col.toLowerCase().includes('month') || 
      col.toLowerCase().includes('year') ||
      col.toLowerCase().includes('period') ||
      col.toLowerCase().includes('time_period') ||
      col.toLowerCase().includes('format(')
    );
    
    // Determine if time-based analysis
    const hasTimeColumn = timeColumns.length > 0;
    
    // Determine numeric columns for values (excluding IDs and counts)
    const numericColumns = columns.filter(col => {
      if (!results[0]) return false;
      const sampleValue = results[0][col];
      return typeof sampleValue === 'number' && 
             !col.toLowerCase().includes('id') &&
             col !== 'key';
    });
    
    // Determine categorical columns for grouping
    const categoricalColumns = columns.filter(col => {
      if (!results[0]) return false;
      return typeof results[0][col] === 'string' && 
             !col.toLowerCase().includes('date') &&
             !timeColumns.includes(col);
    });

    // Determine chart type based on data structure and query
    if (hasTimeColumn && (queryLower.includes('trend') || 
                          queryLower.includes('over time') || 
                          queryLower.includes('timeseries') ||
                          queryLower.includes('time series'))) {
      // Time series data - line chart
      chartData.chartType = 'line';
    } else if (categoricalColumns.length > 0 && numericColumns.length > 1) {
      // Multiple metrics by category - multibar
      chartData.chartType = 'multibar';
    } else if (queryLower.includes('distribution') || 
               queryLower.includes('breakdown') || 
               queryLower.includes('proportion') ||
               queryLower.includes('percentage') ||
               queryLower.includes('share') ||
               queryLower.includes('pie')) {
      // Distribution data - pie chart
      chartData.chartType = 'pie';
    } else if (results.length > 10 && hasTimeColumn) {
      // Lots of time-based data points - line chart
      chartData.chartType = 'line';
    } else if (numericColumns.length > 3) {
      // Multiple metrics - multibar
      chartData.chartType = 'multibar';
    } else if (numericColumns.length === 1 && categoricalColumns.length === 1) {
      // One metric by category - bar chart
      chartData.chartType = 'bar';
    }
    
    // Select appropriate x-axis based on data and chart type
    let xAxisKey = '';
    
    if (hasTimeColumn) {
      // Use time column for x-axis
      xAxisKey = timeColumns[0];
    } else if (categoricalColumns.length > 0) {
      // Use first categorical column for x-axis
      xAxisKey = categoricalColumns[0];
    } else {
      // Fallback to first column
      xAxisKey = columns[0];
    }
    
    // Format data based on chart type
    if (chartData.chartType === 'pie') {
      // For pie charts: need segment and value
      const valueColumn = numericColumns[0] || columns.find(col => typeof results[0][col] === 'number');
      
      if (xAxisKey && valueColumn) {
        // Create pie chart data structure
        chartData.data = results.map(row => ({
          segment: String(row[xAxisKey]),
          value: row[valueColumn]
        }));
        
        // Set chart configuration
        chartData.config.xAxisKey = 'segment';
        chartData.config.title = `Distribution of ${valueColumn} by ${xAxisKey}`;
        chartData.config.description = `Breakdown of ${valueColumn} across different ${xAxisKey} categories`;
        
        // Build chart config for segments
        chartData.chartConfig = {};
        results.forEach(row => {
          const segmentKey = String(row[xAxisKey])
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_]/g, '')
            .toLowerCase();
          
          chartData.chartConfig[segmentKey] = { 
            label: String(row[xAxisKey])
          };
        });
      }
    } else if (chartData.chartType === 'multibar') {
      // For multibar charts: transform data to have category and multiple values
      chartData.config.xAxisKey = xAxisKey;
      
      // Create multibar data structure with all numeric values
      chartData.data = results.map(row => {
        const dataPoint: Record<string, any> = { [xAxisKey]: row[xAxisKey] };
        numericColumns.forEach(col => {
          dataPoint[col] = row[col];
        });
        return dataPoint;
      });
      
      // Set chart configuration
      chartData.config.title = `Comparison of ${numericColumns.slice(0, 3).join(', ')}${numericColumns.length > 3 ? ' and others' : ''} by ${xAxisKey}`;
      chartData.config.description = `Comparing metrics across different ${xAxisKey} values`;
      
      // Build chart config for each series
      chartData.chartConfig = {};
      numericColumns.forEach(col => {
        const colKey = col
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9_]/g, '')
          .toLowerCase();
        
        chartData.chartConfig[colKey] = { label: formatColumnLabel(col) };
      });
    } else {
      // For bar/line charts: simpler structure with one metric
      // Choose the most relevant numeric column
      let valueColumn = '';
      
      // Look for explicitly mentioned columns in the query
      for (const col of numericColumns) {
        if (queryLower.includes(col.toLowerCase())) {
          valueColumn = col;
          break;
        }
      }
      
      // If no column specifically mentioned, use the first suitable one
      if (!valueColumn && numericColumns.length > 0) {
        // Prefer meaningful metrics over counts
        if (numericColumns.some(col => col.toLowerCase().includes('total'))) {
          valueColumn = numericColumns.find(col => col.toLowerCase().includes('total')) || '';
        } else if (numericColumns.some(col => col.toLowerCase().includes('sum'))) {
          valueColumn = numericColumns.find(col => col.toLowerCase().includes('sum')) || '';
        } else if (numericColumns.includes('quantity')) {
          valueColumn = 'quantity';
        } else {
          valueColumn = numericColumns[0];
        }
      }
      
      if (xAxisKey && valueColumn) {
        // Create bar/line chart data structure
        chartData.data = results.map(row => ({
          [xAxisKey]: row[xAxisKey],
          [valueColumn]: row[valueColumn]
        }));
        
        // Set chart configuration
        chartData.config.xAxisKey = xAxisKey;
        
        if (chartData.chartType === 'line') {
          chartData.config.title = `${formatColumnLabel(valueColumn)} Trend by ${formatColumnLabel(xAxisKey)}`;
          chartData.config.description = `How ${formatColumnLabel(valueColumn)} changes over time`;
        } else {
          chartData.config.title = `${formatColumnLabel(valueColumn)} by ${formatColumnLabel(xAxisKey)}`;
          chartData.config.description = `Comparison of ${formatColumnLabel(valueColumn)} across different categories`;
        }
        
        // Build chart config for the value column
        const valueKey = valueColumn
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9_]/g, '')
          .toLowerCase();
        
        chartData.chartConfig = {
          [valueKey]: { label: formatColumnLabel(valueColumn) }
        };
      }
    }
    
    // Special formatting for time periods
    if (hasTimeColumn && chartData.data.length > 0) {
      // Format date labels nicely
      chartData.data = chartData.data.map(item => {
        const timeValue = item[xAxisKey];
        if (timeValue && typeof timeValue === 'string') {
          // Try to format date strings more nicely if possible
          if (timeValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // YYYY-MM-DD format
            const date = new Date(timeValue);
            item[xAxisKey] = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          } else if (timeValue.match(/^\d{4}-\d{2}$/)) {
            // YYYY-MM format
            const [year, month] = timeValue.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            item[xAxisKey] = `${monthNames[parseInt(month) - 1]} ${year}`;
          } else if (timeValue.match(/^\d{4}-Q[1-4]$/)) {
            // YYYY-Q# format
            const [year, quarter] = timeValue.split('-');
            item[xAxisKey] = `${quarter} ${year}`;
          }
        }
        return item;
      });
    }
    
    return chartData;
  } catch (error) {
    console.error('Error preparing data for visualization:', error);
    return null;
  }
}

// Helper function to format column labels for display
function formatColumnLabel(columnName: string): string {
  // Handle special cases
  if (columnName.startsWith('total_')) {
    return 'Total ' + columnName.substring(6).replace(/_/g, ' ');
  }
  if (columnName.startsWith('avg_')) {
    return 'Average ' + columnName.substring(4).replace(/_/g, ' ');
  }
  if (columnName.startsWith('count_')) {
    return 'Count of ' + columnName.substring(6).replace(/_/g, ' ');
  }
  
  // Handle SQL functions
  if (columnName.includes('FORMAT(') || columnName.includes('YEAR(') || 
      columnName.includes('MONTH(') || columnName.includes('DAY(')) {
    return 'Date';
  }
  
  // General case: capitalize and replace underscores with spaces
  return columnName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}