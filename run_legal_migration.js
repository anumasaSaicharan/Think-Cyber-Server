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

async function runLegalDocumentsMigration() {
  try {
    console.log('Running legal documents migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migration_legal_documents.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('Legal documents migration completed successfully!');
    console.log('Created tables: terms_conditions, privacy_policies');
    
  } catch (error) {
    console.error('Legal documents migration failed:', error);
  } finally {
    await pool.end();
  }
}

runLegalDocumentsMigration();
