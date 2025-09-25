const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
});

async function runUploadsMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Running uploads table migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migration_uploads_table.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Uploads table migration completed successfully!');
    console.log('📁 Created uploads table with indexes and triggers');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runUploadsMigration()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = { runUploadsMigration };
