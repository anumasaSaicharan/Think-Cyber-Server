const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'thinkcyber',
  port: process.env.PGPORT || 5432,
});

async function runMigration() {
  try {
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'database', 'migration_razorpay_fields.sql'),
      'utf8'
    );

    console.log('Running Razorpay fields migration...');
    await pool.query(migrationSQL);
    console.log('Migration completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
