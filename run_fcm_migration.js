// Run FCM tokens migration
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool();

async function runMigration() {
  const client = await pool.connect();
  try {
    const migrationPath = path.join(__dirname, 'database', 'migration_fcm_tokens.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running FCM tokens migration...');
    await client.query(sql);
    console.log('FCM tokens migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
