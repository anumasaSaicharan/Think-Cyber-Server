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

async function runMigration() {
  try {
    console.log('Running category fields migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migration_update_category_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('Migration completed successfully!');
    console.log('Category table now includes: description, status, topics_count fields');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
