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
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
});

async function runTopicsMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting topics tables migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migration_topics_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('Topics tables migration completed successfully!');
    console.log('Created tables:');
    console.log('- topics');
    console.log('- topic_modules');
    console.log('- topic_videos');  
    console.log('- topic_enrollments');
    console.log('- topic_progress');
    console.log('- topic_reviews');
    console.log('');
    console.log('Sample topic data has been inserted.');
    
  } catch (err) {
    console.error('Error running topics migration:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runTopicsMigration();
