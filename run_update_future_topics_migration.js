#!/usr/bin/env node

/**
 * Migration: Update existing bundle enrollments to include future topics
 * This script updates all completed bundle enrollments to have future_topics_included = true
 * so existing customers automatically get access to newly added topics
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting migration: Update future_topics_included flag for existing bundles...');

    // Check current state
    const beforeResult = await client.query(`
      SELECT 
        COUNT(*) as total_bundles,
        SUM(CASE WHEN future_topics_included = true THEN 1 ELSE 0 END) as with_future_access,
        SUM(CASE WHEN future_topics_included = false THEN 1 ELSE 0 END) as without_future_access
      FROM user_category_bundles 
      WHERE payment_status = 'completed'
    `);

    const before = beforeResult.rows[0];
    console.log('📊 Before migration:');
    console.log(`   Total completed bundles: ${before.total_bundles}`);
    console.log(`   With future topics access: ${before.with_future_access}`);
    console.log(`   Without future topics access: ${before.without_future_access}`);

    // Run migration
    const updateResult = await client.query(`
      UPDATE user_category_bundles 
      SET future_topics_included = true 
      WHERE payment_status = 'completed' AND future_topics_included = false
      RETURNING id, user_id, category_id
    `);

    console.log(`\n✅ Updated ${updateResult.rows.length} bundle enrollments to include future topics`);

    // Check final state
    const afterResult = await client.query(`
      SELECT 
        COUNT(*) as total_bundles,
        SUM(CASE WHEN future_topics_included = true THEN 1 ELSE 0 END) as with_future_access,
        SUM(CASE WHEN future_topics_included = false THEN 1 ELSE 0 END) as without_future_access
      FROM user_category_bundles 
      WHERE payment_status = 'completed'
    `);

    const after = afterResult.rows[0];
    console.log('\n📊 After migration:');
    console.log(`   Total completed bundles: ${after.total_bundles}`);
    console.log(`   With future topics access: ${after.with_future_access}`);
    console.log(`   Without future topics access: ${after.without_future_access}`);

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Updated enrollments (sample):');
    updateResult.rows.slice(0, 5).forEach((row, idx) => {
      console.log(`   ${idx + 1}. User ${row.user_id} - Category ${row.category_id}`);
    });
    
    if (updateResult.rows.length > 5) {
      console.log(`   ... and ${updateResult.rows.length - 5} more`);
    }

  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
