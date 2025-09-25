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
  ssl: {
    rejectUnauthorized: false
  }
});

async function runSubcategoryMigration() {
  try {
    console.log('Running subcategory fields migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migration_update_subcategory_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('Subcategory migration completed successfully!');
    console.log('Subcategory table now includes: description, status, topics_count fields');
    
  } catch (error) {
    console.error('Subcategory migration failed:', error);
  } finally {
    await pool.end();
  }
}

runSubcategoryMigration();
