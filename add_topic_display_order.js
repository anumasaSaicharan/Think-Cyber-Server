const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Starting migration for topics...');

        // Add display_order to topics
        try {
            await client.query('ALTER TABLE topics ADD COLUMN display_order INTEGER DEFAULT 0');
            console.log('Added display_order to topics table.');
        } catch (e) {
            if (e.code === '42701') {
                console.log('display_order column already exists in topics table.');
            } else {
                console.error('Error adding column to topics:', e);
            }
        }

        console.log('Topic migration completed.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
