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

async function runHomepageMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting homepage tables migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migration_homepage_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('Homepage tables migration completed successfully!');
    console.log('Created tables:');
    console.log('- homepage');
    console.log('- homepage_hero');
    console.log('- homepage_about');  
    console.log('- homepage_contact');
    console.log('- homepage_faqs');
    console.log('');
    console.log('Default English homepage content has been inserted.');
    
  } catch (err) {
    console.error('Error running homepage migration:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runHomepageMigration();
