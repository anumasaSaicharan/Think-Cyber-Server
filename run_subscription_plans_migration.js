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
});

async function runMigration() {
  try {
    console.log('Running subscription plans migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migration_subscription_plans.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('Migration completed successfully!');
    console.log('Subscription plans table created with fields: id, name, features, status, created_at, updated_at');
    console.log('Sample data inserted: Basic Plan, Professional Plan, Enterprise Plan');
    
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
