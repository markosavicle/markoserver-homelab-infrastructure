const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// PostgreSQL Connection Pool configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'pos_admin',
  password: process.env.DB_PASSWORD || 'DiskontPosPassword123!',
  database: process.env.DB_NAME || 'diskont_pos_db',
  port: process.env.DB_PORT || 5432,
});

const runSeed = async () => {
  console.log('[SEED] Starting database seeding process...');
  try {
    const sqlPath = path.join(__dirname, 'init.sql');
    const sqlQuery = fs.readFileSync(sqlPath, 'utf8');

    // Execute complete SQL seeding script
    await pool.query(sqlQuery);
    console.log('[SEED] Database seeded successfully with discount store catalog!');
  } catch (error) {
    console.error('[SEED] Error during database seeding:', error.message);
  } finally {
    await pool.end();
  }
};

runSeed();