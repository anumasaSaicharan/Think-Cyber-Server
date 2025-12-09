const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
});

async function runPriceMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting price column migration...');
    
    const migrationPath = path.join(__dirname, 'database', 'migration_add_price_column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(migrationSQL);
    
    console.log('Price column migration completed successfully!');
    console.log('- Column: price INTEGER DEFAULT 0');
  } catch (err) {
    console.error('Error running price migration:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runPriceMigration();
