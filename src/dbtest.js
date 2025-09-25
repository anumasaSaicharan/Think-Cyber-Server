const { Pool } = require('pg');

const pool = new Pool({
  host: "ep-late-bar-a1bp7teg.ap-southeast-1.aws.neon.tech",
  port: 5432,
  user: "neondb_owner",
  password: "npg_I46OZLyTWMeD",
  database: "neondb",
  ssl: { rejectUnauthorized: false }, // required for Neon serverless
});

const MAX_RETRIES = 10;
const RETRY_DELAY = 5000; // 5 seconds

async function waitForConnection(retries = 0) {
  try {
    const client = await pool.connect();
    console.log('? Connected to NeonDB successfully!');
    client.release();
    return true;
  } catch (err) {
    if (retries < MAX_RETRIES) {
      console.log(`Retrying... compute may still be starting (${err.message})`);
      await new Promise(r => setTimeout(r, RETRY_DELAY));
      return waitForConnection(retries + 1);
    } else {
      console.error('? Could not connect after multiple retries:', err);
      process.exit(1);
    }
  }
}

(async () => {
  await waitForConnection();
  // Now you can run your queries safely
  const res = await pool.query('SELECT NOW()');
  console.log('Database time:', res.rows[0]);
  process.exit(0);
})();
