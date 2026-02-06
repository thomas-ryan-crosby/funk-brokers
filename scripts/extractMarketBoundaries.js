/**
 * One-time script: extract convex-hull boundaries for beta markets from PostGIS.
 *
 * Queries the address_points table for two bounding boxes (Greater New Orleans
 * and Phoenix / Maricopa), computes the convex hull of each cluster, and writes
 * src/data/betaMarkets.json as a GeoJSON FeatureCollection.
 *
 * Usage:
 *   node scripts/extractMarketBoundaries.js
 *
 * Requires DATABASE_URL in .env or .env.local (same as importOpenAddresses.js).
 * Delete this script after running — the generated JSON is all that's needed.
 */
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

/* ── env ─────────────────────────────────────────────────────────── */

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

/* ── markets ─────────────────────────────────────────────────────── */

const MARKETS = [
  {
    name: 'Greater New Orleans',
    // Covers Jefferson, Orleans, St. Tammany, St. Bernard parishes
    west: -91.0,
    south: 29.4,
    east: -89.5,
    north: 30.9,
  },
  {
    name: 'Phoenix Metro',
    // Covers Maricopa County
    west: -113.4,
    south: 32.5,
    east: -111.2,
    north: 34.1,
  },
];

/* ── main ────────────────────────────────────────────────────────── */

async function main() {
  loadEnv();

  const connectionString = (process.env.DATABASE_URL || '').trim();
  if (!connectionString) {
    console.error('DATABASE_URL not set. Set it in .env or the environment.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const features = [];

  try {
    for (const market of MARKETS) {
      console.log(`Querying convex hull for ${market.name}…`);

      const sql = `
        SELECT ST_AsGeoJSON(
          ST_ConvexHull(
            ST_Collect(geom)
          )
        ) AS geojson
        FROM address_points
        WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
      `;

      const { rows } = await pool.query(sql, [
        market.west,
        market.south,
        market.east,
        market.north,
      ]);

      if (!rows[0]?.geojson) {
        console.warn(`  No data found for ${market.name} — skipping.`);
        continue;
      }

      const geometry = JSON.parse(rows[0].geojson);
      features.push({
        type: 'Feature',
        properties: { name: market.name },
        geometry,
      });

      console.log(`  Got ${geometry.type} for ${market.name}.`);
    }
  } finally {
    await pool.end();
  }

  const featureCollection = {
    type: 'FeatureCollection',
    features,
  };

  const outPath = path.join(__dirname, '..', 'src', 'data', 'betaMarkets.json');
  fs.writeFileSync(outPath, JSON.stringify(featureCollection, null, 2) + '\n');
  console.log(`\nWrote ${outPath} (${features.length} feature(s)).`);
}

main();
