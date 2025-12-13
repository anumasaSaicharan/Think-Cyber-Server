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
        console.log('Starting migration...');

        // Add display_order to category
        try {
            await client.query('ALTER TABLE category ADD COLUMN display_order INTEGER DEFAULT 0');
            console.log('Added display_order to category table.');
        } catch (e) {
            if (e.code === '42701') {
                console.log('display_order column already exists in category table.');
            } else {
                console.error('Error adding column to category:', e);
            }
        }

        // Add display_order to subcategory
        try {
            await client.query('ALTER TABLE subcategory ADD COLUMN display_order INTEGER DEFAULT 0');
            console.log('Added display_order to subcategory table.');
        } catch (e) {
            if (e.code === '42701') {
                console.log('display_order column already exists in subcategory table.');
            } else {
                console.error('Error adding column to subcategory:', e);
            }
        }

        console.log('Migration completed.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
