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

async function runMigration() {
  try {
    console.log('Starting additional topics fields migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migration_add_topic_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('Additional topics fields migration completed successfully!');
    console.log('Added fields:');
    console.log('- emoji');
    console.log('- learning_objectives');
    console.log('- target_audience');
    console.log('- prerequisites');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
