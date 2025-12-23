// Script to insert default app version 1.0.0
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool();

async function insertDefaultVersion() {
  try {
    const defaultSettings = {
      updateRequired: false,
      forceUpdate: false,
      latestVersionName: "1.0.0",
      latestVersionCode: 1,
      minVersionCode: 1,
      message: "A new version is available with exciting features and improvements.",
      androidStoreUrl: "https://play.google.com/store/apps/details?id=com.thinkcyber.app",
      iosStoreUrl: "https://apps.apple.com/app/thinkcyber/id123456789"
    };

    const result = await pool.query(
      `INSERT INTO app_settings (setting_key, setting_value, description)
       VALUES ('app_version', $1::jsonb, 'Mobile app version settings for force update functionality')
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = $1::jsonb, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [JSON.stringify(defaultSettings)]
    );

    console.log('Success! Default version 1.0.0 inserted/updated:');
    console.log(JSON.stringify(result.rows[0], null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

insertDefaultVersion();
