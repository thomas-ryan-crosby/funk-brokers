/**
 * Run 010_addresses_openaddresses.sql on Neon. Uses DATABASE_URL from env or .env in project root.
 * Run from project root: node scripts/runAddressesMigration.js
 */
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

function loadEnv() {
  const root = path.join(__dirname, '..');
  for (const name of ['.env.local', '.env']) {
    const envPath = path.join(root, name);
    if (!fs.existsSync(envPath)) continue;
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('DATABASE_URL=')) continue;
      const value = trimmed.slice(trimmed.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
      const beforeComment = value.split(/\s+#/)[0].trim();
      if (beforeComment && !process.env.DATABASE_URL) process.env.DATABASE_URL = beforeComment;
      return;
    }
  }
}

loadEnv();
let connectionString = (process.env.DATABASE_URL || '').trim();
// If copied from Neon's "psql" command, strip the psql '...' wrapper
const psqlMatch = connectionString.match(/psql\s+['"](.+)['"]$/);
if (psqlMatch) connectionString = psqlMatch[1].trim();
if (!connectionString) {
  console.error('DATABASE_URL not set. Set it in .env or the environment.');
  process.exit(1);
}
try {
  const url = new URL(connectionString.replace(/^postgresql:\/\//, 'https://'));
  const host = url.hostname;
  if (!host || host === 'base' || (!host.includes('neon.tech') && !host.startsWith('ep-'))) {
    console.error('DATABASE_URL host in .env should be your Neon host (e.g. ep-xxx-xxx.us-east-2.aws.neon.tech).');
    console.error('Current host looks like:', host || '(could not parse)');
    process.exit(1);
  }
} catch (_) {
  console.error('DATABASE_URL in .env must be a valid postgresql://... URL. Get it from Neon: Connect → connection string.');
  process.exit(1);
}

const sqlPath = path.join(__dirname, 'migrations', '010_addresses_openaddresses.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function run() {
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await pool.query(sql);
    console.log('Migration 010_addresses_openaddresses.sql completed.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
