/**
 * Postgres client for serverless (Wave 4).
 * Env: DATABASE_URL (Neon connection string).
 */

const { Pool } = require('pg');

let _pool = null;

function getPool() {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL not configured');
    }
    _pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  }
  return _pool;
}

async function query(text, params) {
  const pool = getPool();
  return pool.query(text, params);
}

module.exports = { query };
