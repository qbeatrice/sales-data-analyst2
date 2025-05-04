// /lib/sql-query-generator.ts
import { checkDatabaseConnection, query } from './db';

// Define the table schemas as they appear in your database
interface TableSchema {
  tableName: string;
  dbTableName: string;
  description: string;
  columns: Column[];
}

interface Column {
  name: string;
  dbName: string;
  type: string;
  description: string;
  isNullable: boolean;
}

// Define the schemas based on your actual database structure
const salesDataSchema: TableSchema = {
  tableName: 'sales_data',
  dbTableName: 'sales_data',
  description: 'List of sales transactions',
  columns: [
    { name: 'key', dbName: 'key', type: 'int', description: 'Unique identifier of the transaction', isNullable: false },
    { name: 'country', dbName: 'country', type: 'nvarchar', description: 'Country of the store', isNullable: false },
    { name: 'region', dbName: 'region', type: 'nvarchar', description: 'Region of the store', isNullable: false },
    { name: 'city', dbName: 'city', type: 'nvarchar', description: 'City of the store', isNullable: false },
    { name: 'store_id', dbName: 'store_id', type: 'int', description: 'Unique identifier of the store', isNullable: false },
    { name: 'store_name', dbName: 'store_name', type: 'nvarchar', description: 'Name of the store', isNullable: false },
    { name: 'sales_order_number', dbName: 'sales_order_number', type: 'nvarchar', description: 'Sales order unique identifier', isNullable: false },
    { name: 'sales_date', dbName: 'sales_date', type: 'date', description: 'Date of the sales order', isNullable: false },
    { name: 'product_name', dbName: 'product_name', type: 'nvarchar', description: 'Name of the product sold', isNullable: false },
    { name: 'quantity', dbName: 'quantity', type: 'int', description: 'Quantity of the product sold', isNullable: false },
    { name: 'unit_price', dbName: 'unit_price', type: 'decimal', description: 'Price of the product', isNullable: false },
    { name: 'total_product_cost', dbName: 'total_product_cost', type: 'decimal', description: 'Total cost of the product', isNullable: false },
    { name: 'material_cost', dbName: 'material_cost', type: 'decimal', description: 'Cost of the materials used to make the product', isNullable: false },
    { name: 'shipping_cost', dbName: 'shipping_cost', type: 'decimal', description: 'Cost of shipping the product', isNullable: false },
    { name: 'total_cost', dbName: 'total_cost', type: 'decimal', description: 'Total cost of the product', isNullable: false },
    { name: 'sales_type', dbName: 'sales_type', type: 'nvarchar', description: 'Type of sales (instore or delivery)', isNullable: false },
    { name: 'delivery_fee', dbName: 'delivery_fee', type: 'decimal', description: 'Fee for the delivery of the product', isNullable: false },
    { name: 'delivery_duration_mins', dbName: 'delivery_duration_mins', type: 'int', description: 'Amount of time it took to deliver the product', isNullable: true },
    { name: 'discount_code', dbName: 'discount_code', type: 'nvarchar', description: 'Code of the discount applied to the product', isNullable: true },
    { name: 'discount_percent', dbName: 'discount_percent', type: 'int', description: 'Percentage of discount applied to the product', isNullable: true },
    { name: 'delivery_plate', dbName: 'delivery_plate', type: 'nvarchar', description: 'Plate number of the delivery vehicle', isNullable: true }
  ]
};

const productDesignSchema: TableSchema = {
  tableName: 'product_design',
  dbTableName: 'unique_products_with_materials_masterlist',
  description: 'Information on materials used to produce products and associated costs',
  columns: [
    { name: 'Country', dbName: 'Country', type: 'nvarchar', description: 'Country where the product is produced and sold', isNullable: false },
    { name: 'Region', dbName: 'Region', type: 'nvarchar', description: 'Region where the product is produced and sold', isNullable: false },
    { name: 'City', dbName: 'City', type: 'nvarchar', description: 'City where the product is produced and sold', isNullable: false },
    { name: 'Product_Name', dbName: 'Product_Name', type: 'nvarchar', description: 'Name of the product', isNullable: false },
    { name: 'Product_Price', dbName: 'Product_Price', type: 'decimal', description: 'Selling price of the product', isNullable: true },
    { name: 'Material_Code', dbName: 'Material_Code', type: 'nvarchar', description: 'Code of the material used to make the product', isNullable: false },
    { name: 'Material_Quantity', dbName: 'Material_Quantity', type: 'int', description: 'Quantity of the material used to make the product', isNullable: true },
    { name: 'Material_Unit_Cost', dbName: 'Material_Unit_Cost', type: 'decimal', description: 'Unit cost of the material used to make the product', isNullable: true },
    { name: 'Material_Shipping_Cost', dbName: 'Material_Shipping_Cost', type: 'decimal', description: 'Shipping cost of the material used to make the product', isNullable: true },
    { name: 'total_material_cost', dbName: 'total_material_cost', type: 'decimal', description: 'Total cost of the material used to make the product', isNullable: true },
    { name: 'total_material_shipping_cost', dbName: 'total_material_shipping_cost', type: 'decimal', description: 'Total shipping cost of the material used to make the product', isNullable: true }
  ]
};

const vehicleMasterSchema: TableSchema = {
  tableName: 'vehicle_master',
  dbTableName: 'vehicle_master',
  description: 'Information on vehicles available for delivery of products',
  columns: [
    { name: 'Country', dbName: 'Country', type: 'nvarchar', description: 'Country where the vehicle is used', isNullable: false },
    { name: 'Region', dbName: 'Region', type: 'nvarchar', description: 'Region where the vehicle is used', isNullable: false },
    { name: 'City', dbName: 'City', type: 'nvarchar', description: 'City where the vehicle is used', isNullable: false },
    { name: 'Vehicle_Plate', dbName: 'Vehicle_Plate', type: 'nvarchar', description: 'Plate number of the vehicle used to deliver the product', isNullable: false }
  ]
};

// Reference to all schemas
const schemas = {
  sales_data: salesDataSchema,
  product_design: productDesignSchema,
  vehicle_master: vehicleMasterSchema
};

/**
 * Generate a SQL query from natural language
 */
/**
 * Builds a structured SQL query from a natural language query.
 * This function analyzes the user's question and converts it to SQL without using any ORM.
 * @param userQuery - The natural language query from the user
 * @returns An object containing the SQL query, parameters, and explanation
 */
export async function generateSqlQuery(userQuery: string): Promise<{ 
  sql: string, 
  params: any[],
  explanation: string,
  error?: string,
  success: boolean
}> {
  try {
    // Check database connection first
    const dbCheck = await checkDatabaseConnection();
    if (!dbCheck.connected) {
      return {
        sql: '',
        params: [],
        explanation: 'Database connection failed',
        error: 'Unable to connect to the database',
        success: false
      };
    }

    // Simplify the query
    const simplifiedQuery = userQuery.toLowerCase();
    
    // Determine the main table to query
    let mainTable = 'sales_data'; // Default to sales_data
    
    if (simplifiedQuery.includes('product') && simplifiedQuery.includes('material')) {
      mainTable = 'product_design';
    } else if (simplifiedQuery.includes('vehicle') || 
              (simplifiedQuery.includes('delivery') && simplifiedQuery.includes('plate'))) {
      mainTable = 'vehicle_master';
    }
    
    // Determine if we need to do a join
    let needsJoin = false;
    let joinTable = '';
    
    if (mainTable === 'sales_data') {
      if (simplifiedQuery.includes('material') || 
          simplifiedQuery.includes('product price') || 
          simplifiedQuery.includes('product cost')) {
        needsJoin = true;
        joinTable = 'product_design';
      } else if (simplifiedQuery.includes('vehicle') && 
                !simplifiedQuery.includes('delivery plate')) {
        needsJoin = true;
        joinTable = 'vehicle_master';
      }
    }
    
    // Handle special cases for common queries
    let isSalesByProduct = simplifiedQuery.includes('sales by product') || 
                          (simplifiedQuery.includes('sales') && simplifiedQuery.includes('product'));
    
    // Determine if we need aggregation
    const needsAggregation = (
      simplifiedQuery.includes('total') || 
      simplifiedQuery.includes('average') || 
      simplifiedQuery.includes('sum') || 
      simplifiedQuery.includes('count') || 
      simplifiedQuery.includes('min') || 
      simplifiedQuery.includes('max') ||
      simplifiedQuery.includes('group by') ||
      isSalesByProduct
    );
    
    // Determine if we need to filter by time period
    const timeFilters = extractTimeFilters(simplifiedQuery, mainTable);
    
    // Determine columns to select
    const selectedColumns = determineColumns(simplifiedQuery, mainTable, joinTable);
    
    // Special case for sales by product
    if (isSalesByProduct) {
      // Add sum of quantity as the default aggregation if not already present
      if (!selectedColumns.some(col => col.aggregate)) {
        const quantityCol = schemas[mainTable].columns.find(c => c.name.toLowerCase() === 'quantity');
        if (quantityCol) {
          selectedColumns.push({
            tableName: mainTable,
            columnName: quantityCol.dbName,
            displayName: 'total_quantity',
            aggregate: 'SUM'
          });
        }
      }
    }
    
    // Determine grouping needed
    const groupBy = determineGrouping(simplifiedQuery, selectedColumns, mainTable);
    
    // Special case for sales by product
    if (isSalesByProduct && groupBy.length === 0) {
      groupBy.push(`${mainTable}.product_name`);
    }
    
    // Determine other filters
    const filters = determineFilters(simplifiedQuery, mainTable, joinTable);
    
    // Determine sorting
    const sorting = determineSorting(simplifiedQuery, selectedColumns, mainTable, groupBy);
    
    // Limit results
    const limit = determineLimit(simplifiedQuery);
    
    // Build the SQL query
    let sql = buildSqlQuery(
      mainTable, 
      joinTable, 
      selectedColumns, 
      needsAggregation, 
      groupBy, 
      filters.concat(timeFilters), 
      sorting,
      limit
    );
    
    // Prepare the parameters
    const params = filters.concat(timeFilters).map(f => f.value);
    
    // Generate an explanation
    const explanation = generateExplanation(
      mainTable, 
      joinTable, 
      selectedColumns, 
      needsAggregation, 
      groupBy, 
      filters.concat(timeFilters), 
      sorting, 
      limit
    );
    
    return {
      sql,
      params,
      explanation,
      success: true
    };
  } catch (error) {
    console.error('Error generating SQL query:', error);
    return {
      sql: '',
      params: [],
      explanation: 'Failed to generate a SQL query',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      success: false
    };
  }
}

/**
 * Extract time-based filters from the query
 */
function extractTimeFilters(query: string, mainTable: string = 'sales_data'): { field: string, operator: string, value: any }[] {
  const filters = [];
  
  // Look for date ranges
  const dateRegex = /\b\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\b/g;
  const dates = query.match(dateRegex);
  
  if (dates && dates.length > 0) {
    // Standardize date format
    const formattedDates = dates.map(date => {
      return date.replace(/\//g, '-');
    });
    
    if (formattedDates.length === 1) {
      // If only one date is mentioned, assume "on or after" that date
      filters.push({
        field: `${mainTable}.sales_date`,
        operator: '>=',
        value: formattedDates[0]
      });
    } else if (formattedDates.length >= 2) {
      // If two dates are mentioned, assume "between" those dates
      filters.push({
        field: `${mainTable}.sales_date`,
        operator: '>=',
        value: formattedDates[0]
      });
      
      filters.push({
        field: `${mainTable}.sales_date`,
        operator: '<=',
        value: formattedDates[1]
      });
    }
  }
  
  // Look for relative time periods
  if (query.includes('last month') || query.includes('previous month')) {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    
    filters.push({
      field: `${mainTable}.sales_date`,
      operator: '>=',
      value: lastMonth.toISOString().split('T')[0]
    });
    
    filters.push({
      field: `${mainTable}.sales_date`,
      operator: '<=',
      value: lastMonthEnd.toISOString().split('T')[0]
    });
  } else if (query.includes('this month') || query.includes('current month')) {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    filters.push({
      field: `${mainTable}.sales_date`,
      operator: '>=',
      value: thisMonth.toISOString().split('T')[0]
    });
  } else if (query.includes('last year') || query.includes('previous year')) {
    const today = new Date();
    const lastYear = today.getFullYear() - 1;
    
    filters.push({
      field: `${mainTable}.sales_date`,
      operator: '>=',
      value: `${lastYear}-01-01`
    });
    
    filters.push({
      field: `${mainTable}.sales_date`,
      operator: '<=',
      value: `${lastYear}-12-31`
    });
  } else if (query.includes('this year') || query.includes('current year')) {
    const today = new Date();
    const thisYear = today.getFullYear();
    
    filters.push({
      field: `${mainTable}.sales_date`,
      operator: '>=',
      value: `${thisYear}-01-01`
    });
  }
  
  return filters;
}

/**
 * Determine which columns to select based on the query
 */
function determineColumns(
  query: string, 
  mainTable: string, 
  joinTable: string
): { tableName: string, columnName: string, displayName: string, aggregate?: string }[] {
  const columns: { tableName: string, columnName: string, displayName: string, aggregate?: string }[] = [];
  
  const schema = schemas[mainTable];
  const simplifiedQuery = query.toLowerCase();
  
  // Check if we need to count records
  if (simplifiedQuery.includes('how many') || 
      simplifiedQuery.includes('count') || 
      simplifiedQuery.includes('number of')) {
    columns.push({
      tableName: mainTable,
      columnName: 'COUNT(*)',
      displayName: 'record_count',
      aggregate: 'COUNT'
    });
  }
  
  // Check for sum/total calculations
  if (simplifiedQuery.includes('total') || simplifiedQuery.includes('sum')) {
    // Look for specific columns to sum
    for (const col of schema.columns) {
      if ((col.type === 'decimal' || col.type === 'int') && 
          (simplifiedQuery.includes(col.name.toLowerCase()) ||
           simplifiedQuery.includes(col.description.toLowerCase()))) {
        columns.push({
          tableName: mainTable,
          columnName: col.dbName,
          displayName: `total_${col.name}`,
          aggregate: 'SUM'
        });
      }
    }
    
    // If no specific column found but we need a sum, try to pick reasonable defaults
    if (!columns.some(c => c.aggregate === 'SUM')) {
      if (mainTable === 'sales_data') {
        // By default, sum quantity for sales queries
        if (simplifiedQuery.includes('sales')) {
          const col = schema.columns.find(c => c.name.toLowerCase() === 'quantity');
          if (col) {
            columns.push({
              tableName: mainTable,
              columnName: col.dbName,
              displayName: `total_quantity`,
              aggregate: 'SUM'
            });
          }
        } else {
          // Otherwise try other reasonable defaults
          const defaultColumns = ['quantity', 'total_cost', 'total_product_cost'];
          for (const colName of defaultColumns) {
            const col = schema.columns.find(c => c.name.toLowerCase() === colName);
            if (col) {
              columns.push({
                tableName: mainTable,
                columnName: col.dbName,
                displayName: `total_${col.name}`,
                aggregate: 'SUM'
              });
              break; // Just pick one default
            }
          }
        }
      }
    }
  }
  
  // Check for average calculations
  if (simplifiedQuery.includes('average') || simplifiedQuery.includes('avg')) {
    // Look for specific columns to average
    for (const col of schema.columns) {
      if ((col.type === 'decimal' || col.type === 'int') && 
          (simplifiedQuery.includes(col.name.toLowerCase()) ||
           simplifiedQuery.includes(col.description.toLowerCase()))) {
        columns.push({
          tableName: mainTable,
          columnName: col.dbName,
          displayName: `avg_${col.name}`,
          aggregate: 'AVG'
        });
      }
    }
    
    // If no specific column found but we need an average, try to pick reasonable defaults
    if (!columns.some(c => c.aggregate === 'AVG')) {
      if (mainTable === 'sales_data') {
        // By default, average unit_price, total_cost, or delivery_duration_mins
        const defaultColumns = ['unit_price', 'total_cost', 'delivery_duration_mins'];
        for (const colName of defaultColumns) {
          const col = schema.columns.find(c => c.name.toLowerCase() === colName);
          if (col) {
            columns.push({
              tableName: mainTable,
              columnName: col.dbName,
              displayName: `avg_${col.name}`,
              aggregate: 'AVG'
            });
            break; // Just pick one default
          }
        }
      }
    }
  }
  
  // Add columns specifically mentioned in the query
  for (const col of schema.columns) {
    // Skip technical columns
    if (col.name === 'created_at' || col.name === 'updated_at') {
      continue;
    }
    
    if (simplifiedQuery.includes(col.name.toLowerCase()) || 
        simplifiedQuery.includes(col.description.toLowerCase())) {
      // Skip if this column already has an aggregate
      if (!columns.some(c => c.columnName === col.dbName && c.aggregate)) {
        columns.push({
          tableName: mainTable,
          columnName: col.dbName,
          displayName: col.name
        });
      }
    }
  }
  
  // If joining with another table, add relevant columns from there too
  if (joinTable) {
    const joinSchema = schemas[joinTable];
    
    for (const col of joinSchema.columns) {
      // Skip technical columns
      if (col.name === 'created_at' || col.name === 'updated_at') {
        continue;
      }
      
      if (simplifiedQuery.includes(col.name.toLowerCase()) || 
          simplifiedQuery.includes(col.description.toLowerCase())) {
        columns.push({
          tableName: joinTable,
          columnName: col.dbName,
          displayName: `${joinTable}_${col.name}`
        });
      }
    }
  }
  
  // If no columns selected yet, add some sensible defaults
  if (columns.length === 0) {
    // For sales data, include key columns by default
    if (mainTable === 'sales_data') {
      const defaultColumns = [
        'sales_date', 'product_name', 'quantity', 'unit_price', 'total_cost'
      ];
      
      for (const colName of defaultColumns) {
        const col = schema.columns.find(c => c.name.toLowerCase() === colName.toLowerCase());
        if (col) {
          columns.push({
            tableName: mainTable,
            columnName: col.dbName,
            displayName: col.name
          });
        }
      }
    } else {
      // For other tables, include all non-technical columns
      for (const col of schema.columns) {
        if (col.name !== 'created_at' && col.name !== 'updated_at') {
          columns.push({
            tableName: mainTable,
            columnName: col.dbName,
            displayName: col.name
          });
        }
      }
    }
  }
  
  return columns;
}

/**
 * Determine grouping needed based on the query
 */
function determineGrouping(
  query: string, 
  selectedColumns: { tableName: string, columnName: string, displayName: string, aggregate?: string }[],
  mainTable: string
): string[] {
  const groupBy: string[] = [];
  const simplifiedQuery = query.toLowerCase();
  
  // Check if we have any aggregates
  const hasAggregates = selectedColumns.some(col => col.aggregate);
  
  if (hasAggregates) {
    // Check for specific grouping terms
    if (simplifiedQuery.includes('by country')) {
      groupBy.push(`${mainTable}.country`);
    } else if (simplifiedQuery.includes('by region')) {
      groupBy.push(`${mainTable}.region`);
    } else if (simplifiedQuery.includes('by city')) {
      groupBy.push(`${mainTable}.city`);
    } else if (simplifiedQuery.includes('by store')) {
      groupBy.push(`${mainTable}.store_name`);
    } else if (simplifiedQuery.includes('by product') || simplifiedQuery.includes('by product_name') || simplifiedQuery.includes('sales by product')) {
      groupBy.push(`${mainTable}.product_name`);
    } else if (simplifiedQuery.includes('by month') || simplifiedQuery.includes('monthly')) {
      groupBy.push(`FORMAT(${mainTable}.sales_date, 'yyyy-MM')`);
    } else if (simplifiedQuery.includes('by year') || simplifiedQuery.includes('yearly')) {
      groupBy.push(`YEAR(${mainTable}.sales_date)`);
    } else if (simplifiedQuery.includes('by quarter') || simplifiedQuery.includes('quarterly')) {
      groupBy.push(`CONCAT(YEAR(${mainTable}.sales_date), '-Q', DATEPART(QUARTER, ${mainTable}.sales_date))`);
    } else if (simplifiedQuery.includes('by week') || simplifiedQuery.includes('weekly')) {
      groupBy.push(`CONCAT(YEAR(${mainTable}.sales_date), '-', DATEPART(WEEK, ${mainTable}.sales_date))`);
    } else if (simplifiedQuery.includes('by day') || simplifiedQuery.includes('daily')) {
      groupBy.push(`FORMAT(${mainTable}.sales_date, 'yyyy-MM-dd')`);
    }
    
    // If no specific grouping mentioned but we have aggregates, try to infer a sensible grouping
    if (groupBy.length === 0) {
      if (simplifiedQuery.includes('trend') || 
          simplifiedQuery.includes('over time') || 
          simplifiedQuery.includes('time series')) {
        // Default to monthly grouping for time series
        groupBy.push(`FORMAT(${mainTable}.sales_date, 'yyyy-MM')`);
      } else {
        // For any other aggregation, try to find a categorical column to group by
        for (const col of selectedColumns) {
          if (!col.aggregate) {
            // This is potentially a dimension to group by
            groupBy.push(`${col.tableName}.${col.columnName}`);
          }
        }
      }
    }
  }
  
  return groupBy;
}

/**
 * Determine filters based on the query
 */
function determineFilters(
  query: string, 
  mainTable: string, 
  joinTable: string
): { field: string, operator: string, value: any }[] {
  const filters: { field: string, operator: string, value: any }[] = [];
  const simplifiedQuery = query.toLowerCase();
  const schema = schemas[mainTable];
  
  // Look for specific filter patterns
  // "where X is Y" or "with X = Y" or "X equals Y"
  for (const col of schema.columns) {
    const colLower = col.name.toLowerCase();
    
    // Equals filter
    const equalsRegex = new RegExp(`(where|with|for|if)\\s+${colLower}\\s+(is|=|equals?)\\s+([\\w\\s]+)`, 'i');
    const equalsMatch = simplifiedQuery.match(equalsRegex);
    
    if (equalsMatch) {
      filters.push({
        field: `${mainTable}.${col.dbName}`,
        operator: '=',
        value: equalsMatch[3].trim()
      });
    }
    
    // Contains filter
    const containsRegex = new RegExp(`${colLower}\\s+(contains|like|has)\\s+([\\w\\s]+)`, 'i');
    const containsMatch = simplifiedQuery.match(containsRegex);
    
    if (containsMatch) {
      filters.push({
        field: `${mainTable}.${col.dbName}`,
        operator: 'LIKE',
        value: `%${containsMatch[2].trim()}%`
      });
    }
    
    // Greater than filter
    const greaterRegex = new RegExp(`${colLower}\\s+(>|greater than|more than)\\s+([\\d.]+)`, 'i');
    const greaterMatch = simplifiedQuery.match(greaterRegex);
    
    if (greaterMatch) {
      filters.push({
        field: `${mainTable}.${col.dbName}`,
        operator: '>',
        value: parseFloat(greaterMatch[2].trim())
      });
    }
    
    // Less than filter
    const lessRegex = new RegExp(`${colLower}\\s+(<|less than|under)\\s+([\\d.]+)`, 'i');
    const lessMatch = simplifiedQuery.match(lessRegex);
    
    if (lessMatch) {
      filters.push({
        field: `${mainTable}.${col.dbName}`,
        operator: '<',
        value: parseFloat(lessMatch[2].trim())
      });
    }
  }
  
  // Add filters for join table if needed
  if (joinTable) {
    const joinSchema = schemas[joinTable];
    
    for (const col of joinSchema.columns) {
      const colLower = col.name.toLowerCase();
      
      // Equals filter
      const equalsRegex = new RegExp(`(where|with|for|if)\\s+${colLower}\\s+(is|=|equals?)\\s+([\\w\\s]+)`, 'i');
      const equalsMatch = simplifiedQuery.match(equalsRegex);
      
      if (equalsMatch) {
        filters.push({
          field: `${joinTable}.${col.dbName}`,
          operator: '=',
          value: equalsMatch[3].trim()
        });
      }
      
      // Contains filter
      const containsRegex = new RegExp(`${colLower}\\s+(contains|like|has)\\s+([\\w\\s]+)`, 'i');
      const containsMatch = simplifiedQuery.match(containsRegex);
      
      if (containsMatch) {
        filters.push({
          field: `${joinTable}.${col.dbName}`,
          operator: 'LIKE',
          value: `%${containsMatch[2].trim()}%`
        });
      }
    }
  }
  
  // Add common filter shortcuts
  if (simplifiedQuery.includes('instore') || simplifiedQuery.includes('in store')) {
    filters.push({
      field: `${mainTable}.sales_type`,
      operator: '=',
      value: 'instore'
    });
  } else if (simplifiedQuery.includes('delivery') && !simplifiedQuery.includes('delivery fee') && !simplifiedQuery.includes('delivery plate')) {
    filters.push({
      field: `${mainTable}.sales_type`,
      operator: '=',
      value: 'delivery'
    });
  }
  
  // Look for any country, region, or city mentioned
  const locationRegex = /(in|for|at|from)\s+([a-z\s]+)(country|region|city)/i;
  const locationMatch = simplifiedQuery.match(locationRegex);
  
  if (locationMatch) {
    const location = locationMatch[2].trim();
    const locationType = locationMatch[3].toLowerCase();
    
    filters.push({
      field: `${mainTable}.${locationType}`,
      operator: '=',
      value: location
    });
  }
  
  return filters;
}

/**
 * Determine sorting options based on the query
 */
/**
 * Determine limit for the query results
 */
function determineLimit(query: string): number | null {
  const simplifiedQuery = query.toLowerCase();
  
  // Look for specific limit terms
  const limitRegex = /(top|first|limit)\s+(\d+)/i;
  const limitMatch = simplifiedQuery.match(limitRegex);
  
  if (limitMatch) {
    return parseInt(limitMatch[2], 10);
  }
  
  // Look for other limit indicators
  if (simplifiedQuery.includes('recent')) {
    return 10; // Default limit for recent records
  }
  
  return null; // No limit specified
}

/**
 * Build the SQL query based on all the parameters
 */
function buildSqlQuery(
  mainTable: string,
  joinTable: string,
  selectedColumns: { tableName: string, columnName: string, displayName: string, aggregate?: string }[],
  needsAggregation: boolean,
  groupBy: string[],
  filters: { field: string, operator: string, value: any }[],
  sorting: { field: string, direction: string } | null,
  limit: number | null
): string {
  // Start building the query
  let sql = 'SELECT ';
  
  // Ensure all GROUP BY fields are in the SELECT list
  let columnsToSelect = [...selectedColumns];
  
  // If we have GROUP BY clauses, make sure all those columns are also selected
  if (groupBy.length > 0) {
    for (const groupItem of groupBy) {
      // Extract column name from GROUP BY item
      let columnName = '';
      
      // Handle function expressions in GROUP BY
      if (groupItem.includes('(')) {
        // This is a function call like FORMAT() or YEAR(), keep it as is
        continue; // We'll handle these specially below
      } else {
        // This is a simple column reference like 'sales_data.product_name'
        const parts = groupItem.split('.');
        if (parts.length > 1) {
          columnName = parts[1];
        } else {
          columnName = parts[0];
        }
      }
      
      // Check if we already have this column in the select list
      const alreadySelected = columnsToSelect.some(col => 
        col.columnName === columnName || 
        `${col.tableName}.${col.columnName}` === groupItem
      );
      
      // If not already selected, add it
      if (!alreadySelected) {
        // Determine which table this column belongs to
        const tableName = groupItem.split('.')[0];
        
        // Add to select list
        columnsToSelect.push({
          tableName,
          columnName,
          displayName: columnName
        });
      }
    }
    
    // Handle function expressions in GROUP BY (like FORMAT or YEAR functions)
    for (const groupItem of groupBy) {
      if (groupItem.includes('(')) {
        // This is a function call, we need to add it as-is to the SELECT list
        // Extract a reasonable name for it
        let displayName = '';
        if (groupItem.includes('FORMAT')) {
          displayName = 'month';
        } else if (groupItem.includes('YEAR')) {
          displayName = 'year';
        } else if (groupItem.includes('QUARTER')) {
          displayName = 'quarter';
        } else if (groupItem.includes('WEEK')) {
          displayName = 'week';
        } else {
          // Generic name if we can't determine a specific one
          displayName = 'group_field';
        }
        
        // Check if we have a similar column already
        const alreadyHasSimilar = columnsToSelect.some(col => col.displayName === displayName);
        if (!alreadyHasSimilar) {
          // Add this function expression to our select list
          columnsToSelect.push({
            tableName: '',  // No specific table for function expressions
            columnName: groupItem,
            displayName
          });
        }
      }
    }
  }
  
  // Create the SELECT list
  if (columnsToSelect.length === 0) {
    sql += '* ';
  } else {
    const columnSelections = columnsToSelect.map(col => {
      if (col.columnName === 'COUNT(*)') {
        return `COUNT(*) AS ${col.displayName}`;
      } else if (col.aggregate) {
        return `${col.aggregate}(${col.tableName}.${col.columnName}) AS ${col.displayName}`;
      } else if (!col.tableName || col.columnName.includes('(')) {
        // This is a function expression, use it directly
        return `${col.columnName} AS ${col.displayName}`;
      } else {
        return `${col.tableName}.${col.columnName} AS ${col.displayName}`;
      }
    });
    
    sql += columnSelections.join(', ');
  }
  
  // Add FROM clause
  sql += ` FROM ${schemas[mainTable].dbTableName} AS ${mainTable}`;
  
  // Add JOIN if needed
  if (joinTable) {
    const joinSchema = schemas[joinTable];
    
    // Determine join conditions based on the tables
    let joinCondition = '';
    
    if (mainTable === 'sales_data' && joinTable === 'product_design') {
      joinCondition = `${mainTable}.product_name = ${joinTable}.Product_Name 
                      AND ${mainTable}.country = ${joinTable}.Country 
                      AND ${mainTable}.region = ${joinTable}.Region 
                      AND ${mainTable}.city = ${joinTable}.City`;
    } else if (mainTable === 'sales_data' && joinTable === 'vehicle_master') {
      joinCondition = `${mainTable}.delivery_plate = ${joinTable}.Vehicle_Plate 
                      AND ${mainTable}.country = ${joinTable}.Country 
                      AND ${mainTable}.region = ${joinTable}.Region 
                      AND ${mainTable}.city = ${joinTable}.City`;
    }
    
    sql += ` LEFT JOIN ${joinSchema.dbTableName} AS ${joinTable} ON ${joinCondition}`;
  }
  
  // Add WHERE clause if needed
  if (filters.length > 0) {
    sql += ' WHERE ';
    
    const filterClauses = filters.map((filter, index) => {
      // For parameterized queries, use placeholder
      return `${filter.field} ${filter.operator} ?`;
    });
    
    sql += filterClauses.join(' AND ');
  }
  
  // Add GROUP BY clause if needed
  if (groupBy.length > 0) {
    sql += ' GROUP BY ';
    sql += groupBy.join(', ');
  }
  
  // Add ORDER BY clause if needed
  if (sorting) {
    // Check if we're doing aggregation and the sorting field isn't in an aggregate function
    const hasAggregates = selectedColumns.some(col => col.aggregate);
    const sortingUsesAggregate = sorting.field.includes('(');
    const sortingFieldBase = sorting.field.split('.').pop() || '';
    const sortingFieldIsInGroupBy = groupBy.some(g => g.includes(sortingFieldBase));
    
    // Only add ORDER BY if it's valid (either no aggregation, or sorting on aggregated field, or field is in GROUP BY)
    if (!hasAggregates || sortingUsesAggregate || sortingFieldIsInGroupBy) {
      sql += ` ORDER BY ${sorting.field} ${sorting.direction}`;
    }
  }
  
  // Add LIMIT clause if needed
  if (limit !== null) {
    sql += ` LIMIT ${limit}`;
  }
  
  return sql;
}

/**
 * Generate an explanation of the query for the user
 */
function generateExplanation(
  mainTable: string,
  joinTable: string,
  selectedColumns: { tableName: string, columnName: string, displayName: string, aggregate?: string }[],
  needsAggregation: boolean,
  groupBy: string[],
  filters: { field: string, operator: string, value: any }[],
  sorting: { field: string, direction: string } | null,
  limit: number | null
): string {
  let explanation = `This query retrieves data from the ${schemas[mainTable].description}`;
  
  if (joinTable) {
    explanation += ` and joins it with the ${schemas[joinTable].description}`;
  }
  
  // Explain what we're selecting
  if (selectedColumns.length > 0) {
    const aggregateColumns = selectedColumns.filter(col => col.aggregate);
    const regularColumns = selectedColumns.filter(col => !col.aggregate);
    
    if (aggregateColumns.length > 0) {
      explanation += `. It calculates `;
      
      const aggregateExplanations = aggregateColumns.map(col => {
        if (col.aggregate === 'COUNT' && col.columnName === 'COUNT(*)') {
          return `the total count of records`;
        } else if (col.aggregate === 'SUM') {
          return `the sum of ${col.columnName}`;
        } else if (col.aggregate === 'AVG') {
          return `the average ${col.columnName}`;
        } else {
          return `${col.aggregate} of ${col.columnName}`;
        }
      });
      
      explanation += aggregateExplanations.join(', ');
    }
    
    if (regularColumns.length > 0) {
      explanation += ` and includes `;
      
      const regularColumnNames = regularColumns.map(col => col.displayName);
      explanation += regularColumnNames.join(', ');
    }
  }
  
  // Explain filters
  if (filters.length > 0) {
    explanation += `. The data is filtered to include only records where `;
    
    const filterExplanations = filters.map(filter => {
      const fieldName = filter.field.split('.')[1]; // Extract just the column name
      return `${fieldName} ${filter.operator} ${filter.value}`;
    });
    
    explanation += filterExplanations.join(' and ');
  }
  
  // Explain grouping
  if (groupBy.length > 0) {
    explanation += `. The results are grouped by `;
    
    const groupExplanations = groupBy.map(group => {
      // Extract just the column name or function
      const parts = group.split('.');
      return parts.length > 1 ? parts[1] : group;
    });
    
    explanation += groupExplanations.join(', ');
  }
  
  // Explain sorting
  if (sorting) {
    // Check if sorting would actually be applied (based on aggregation rules)
    const hasAggregates = selectedColumns.some(col => col.aggregate);
    const sortingUsesAggregate = sorting.field.includes('(');
    const sortingFieldBase = sorting.field.split('.').pop() || '';
    const sortingFieldIsInGroupBy = groupBy.some(g => g.includes(sortingFieldBase));
    
    if (!hasAggregates || sortingUsesAggregate || sortingFieldIsInGroupBy) {
      const fieldName = sorting.field.split('(').pop()?.split(')')[0]?.split('.')[1] || sorting.field;
      explanation += `. The results are ordered by ${fieldName} in ${sorting.direction.toLowerCase()} order`;
    }
  }
  
  // Explain limit
  if (limit !== null) {
    explanation += `. Only the first ${limit} results will be returned`;
  }
  
  return explanation + '.';
}

/**
 * Determine sorting options based on the query
 */
function determineSorting(
  query: string, 
  selectedColumns: { tableName: string, columnName: string, displayName: string, aggregate?: string }[],
  mainTable: string,
  groupBy: string[]
): { field: string, direction: string } | null {
  const simplifiedQuery = query.toLowerCase();
  
  // Look for specific sorting terms
  if (simplifiedQuery.includes('order by') || 
      simplifiedQuery.includes('sort by') || 
      simplifiedQuery.includes('sorted by')) {
    // Try to find which column to sort by
    for (const col of selectedColumns) {
      // Skip aggregated columns for direct matching
      if (col.aggregate) continue;
      
      if (simplifiedQuery.includes(`order by ${col.displayName.toLowerCase()}`) || 
          simplifiedQuery.includes(`sort by ${col.displayName.toLowerCase()}`) ||
          simplifiedQuery.includes(`sorted by ${col.displayName.toLowerCase()}`)) {
        // Determine direction
        let direction = 'ASC';
        
        if (simplifiedQuery.includes('descending') || 
            simplifiedQuery.includes('desc') || 
            simplifiedQuery.includes('highest') ||
            simplifiedQuery.includes('most')) {
          direction = 'DESC';
        }
        
        return {
          field: `${col.tableName}.${col.columnName}`,
          direction
        };
      }
    }
    
    // Check for aggregate columns
    for (const col of selectedColumns) {
      if (col.aggregate) {
        if (simplifiedQuery.includes(`order by ${col.displayName.toLowerCase()}`) || 
            simplifiedQuery.includes(`sort by ${col.displayName.toLowerCase()}`) ||
            simplifiedQuery.includes(`sorted by ${col.displayName.toLowerCase()}`)) {
          // Determine direction
          let direction = 'ASC';
          
          if (simplifiedQuery.includes('descending') || 
              simplifiedQuery.includes('desc') || 
              simplifiedQuery.includes('highest') ||
              simplifiedQuery.includes('most')) {
            direction = 'DESC';
          }
          
          return {
            field: `${col.aggregate}(${col.tableName}.${col.columnName})`,
            direction
          };
        }
      }
    }
  }
  
  // Default to most recent if sorting not specified but we have a date column
  // Only apply default date sorting if not doing aggregation or if the date is in the group by
  const hasAggregates = selectedColumns.some(col => col.aggregate);
  const dateInGroupBy = groupBy.some(g => g.includes('sales_date'));
  
  if (mainTable === 'sales_data' && !simplifiedQuery.includes('oldest') && (!hasAggregates || dateInGroupBy)) {
    return {
      field: `${mainTable}.sales_date`,
      direction: 'DESC'
    };
  }
  
  return null;
}