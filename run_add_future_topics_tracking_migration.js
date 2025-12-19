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
    console.log('Starting future topics tracking migration...');
    const migrationPath = path.join(__dirname, 'database', 'migration_add_future_topics_tracking.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await pool.query(sql);
    console.log('✓ Future topics tracking migration completed successfully!');
    console.log('✓ Added columns to user_category_bundles:');
    console.log('  - future_topics_included (boolean): tracks if bundle includes future topics');
    console.log('  - enrolled_at (timestamp): tracks when user enrolled in bundle');
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
