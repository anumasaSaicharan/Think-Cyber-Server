// Run account closure migration
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const pool = new Pool();

async function runMigration() {
  const client = await pool.connect();
  try {
    const migrationPath = path.join(__dirname, 'database', 'migration_account_closure.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running account closure migration...');
    await client.query(sql);
    console.log('✅ Account closure migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
