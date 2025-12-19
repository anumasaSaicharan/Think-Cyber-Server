#!/usr/bin/env node

/**
 * Migration: Fix future_topics_included flag based on plan type
 * - BUNDLE plans: future_topics_included should be TRUE (get all new topics)
 * - FLEXIBLE/INDIVIDUAL plans: future_topics_included should be FALSE (only get topics at purchase time)
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
    console.log('🚀 Starting migration: Fix future_topics_included based on plan type...\n');

    // Get current state
    const beforeResult = await client.query(`
      SELECT 
        c.plan_type,
        COUNT(ucb.id) as count,
        SUM(CASE WHEN ucb.future_topics_included = true THEN 1 ELSE 0 END) as with_future_access,
        SUM(CASE WHEN ucb.future_topics_included = false THEN 1 ELSE 0 END) as without_future_access
      FROM user_category_bundles ucb
      JOIN category c ON ucb.category_id = c.id
      WHERE ucb.payment_status = 'completed'
      GROUP BY c.plan_type
      ORDER BY c.plan_type
    `);

    console.log('📊 Before migration:');
    beforeResult.rows.forEach(row => {
      console.log(`   ${row.plan_type}: ${row.count} enrollments (${row.with_future_access || 0} with future, ${row.without_future_access || 0} without)`);
    });

    // Fix BUNDLE plans - set to TRUE
    const bundleResult = await client.query(`
      UPDATE user_category_bundles 
      SET future_topics_included = true
      WHERE payment_status = 'completed' 
        AND category_id IN (SELECT id FROM category WHERE plan_type = 'BUNDLE')
        AND future_topics_included = false
      RETURNING id, user_id, category_id
    `);

    console.log(`\n✅ Updated ${bundleResult.rows.length} BUNDLE enrollments to future_topics_included = true`);

    // Fix FLEXIBLE/INDIVIDUAL plans - set to FALSE
    const flexibleResult = await client.query(`
      UPDATE user_category_bundles 
      SET future_topics_included = false
      WHERE payment_status = 'completed' 
        AND category_id IN (SELECT id FROM category WHERE plan_type IN ('FLEXIBLE', 'INDIVIDUAL'))
        AND future_topics_included = true
      RETURNING id, user_id, category_id
    `);

    console.log(`✅ Updated ${flexibleResult.rows.length} FLEXIBLE/INDIVIDUAL enrollments to future_topics_included = false`);

    // Check final state
    const afterResult = await client.query(`
      SELECT 
        c.plan_type,
        COUNT(ucb.id) as count,
        SUM(CASE WHEN ucb.future_topics_included = true THEN 1 ELSE 0 END) as with_future_access,
        SUM(CASE WHEN ucb.future_topics_included = false THEN 1 ELSE 0 END) as without_future_access
      FROM user_category_bundles ucb
      JOIN category c ON ucb.category_id = c.id
      WHERE ucb.payment_status = 'completed'
      GROUP BY c.plan_type
      ORDER BY c.plan_type
    `);

    console.log('\n📊 After migration:');
    afterResult.rows.forEach(row => {
      console.log(`   ${row.plan_type}: ${row.count} enrollments (${row.with_future_access || 0} with future, ${row.without_future_access || 0} without)`);
    });

    // Show all updated enrollments
    const allUpdated = await client.query(`
      SELECT 
        ucb.user_id, 
        ucb.category_id, 
        c.plan_type,
        ucb.future_topics_included,
        ucb.enrolled_at
      FROM user_category_bundles ucb
      JOIN category c ON ucb.category_id = c.id
      WHERE ucb.payment_status = 'completed'
      ORDER BY ucb.user_id, ucb.category_id
    `);

    console.log('\n✨ Final bundle enrollments:');
    allUpdated.rows.forEach(row => {
      const status = row.future_topics_included ? '✅ Future Topics' : '🔒 Purchase Time Only';
      console.log(`   User ${row.user_id} - Category ${row.category_id} (${row.plan_type}) - ${status}`);
    });

    console.log('\n🎉 Migration completed successfully!');

  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
