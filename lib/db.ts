// /lib/db.ts
import sql from 'mssql';

// Database connection configuration
// These should be set in your .env.local file
const dbConfig: sql.config = {
  server: process.env.SQL_SERVER || 'sql-server-analyst-agent.database.windows.net',
  database: process.env.SQL_DATABASE || 'analyst-sql-db',
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  port: parseInt(process.env.SQL_PORT || '1433'), // Default SQL Server port
  options: {
    encrypt: true, // For Azure SQL Server
    trustServerCertificate: false, // For Azure, set to false
    enableArithAbort: true,
    connectionTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Create a singleton pool
let pool: sql.ConnectionPool;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    console.log('Creating new SQL Server connection pool');
    pool = await new sql.ConnectionPool(dbConfig).connect();
    
    // Error handling for the pool
    pool.on('error', (err) => {
      console.error('Unexpected error on SQL Server connection:', err);
      // Don't exit the process as that would crash the server
      // Instead, we'll create a new pool on the next request
      pool = null;
    });
  }
  
  return pool;
}

// Simple query function for raw SQL
export async function query(queryText: string, params: any[] = []) {
  const pool = await getPool();
  try {
    const request = pool.request();
    
    // Add parameters
    params.forEach((param, index) => {
      request.input(`p${index}`, param);
    });
    
    // Replace ? placeholders with @paramX
    let preparedQuery = queryText;
    params.forEach((_, index) => {
      preparedQuery = preparedQuery.replace('?', `@p${index}`);
    });
    
    return await request.query(preparedQuery);
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}

// Health check function
export async function checkDatabaseConnection() {
  try {
    const result = await query('SELECT GETDATE() as now');
    return { connected: true, timestamp: result.recordset[0].now };
  } catch (error) {
    console.error('Database connection error:', error);
    return { connected: false, error };
  }
}

// Execute a transaction
export async function executeTransaction<T>(
  callback: (transaction: sql.Transaction) => Promise<T>
): Promise<T> {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}