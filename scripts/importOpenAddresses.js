/**
 * Import OpenAddresses data into address_points table.
 * Supports both CSV and line-delimited GeoJSON (.geojson / .geojson.gz).
 *
 * Usage:
 *   node scripts/importOpenAddresses.js --file path/to/addresses.csv
 *   node scripts/importOpenAddresses.js --file path/to/source.geojson.gz
 *   node scripts/importOpenAddresses.js --dir  path/to/data-directory
 *
 * CSV columns: LON, LAT, NUMBER, STREET, UNIT, CITY, DISTRICT, REGION, POSTCODE
 * GeoJSON: line-delimited Feature objects with properties {number, street, unit, city, district, region, postcode}
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const readline = require('readline');
const { Pool } = require('pg');

const BATCH_SIZE = 1000;
const LOG_EVERY = 10000;

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

/* ── csv helpers ─────────────────────────────────────────────────── */

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/* ── format detection ────────────────────────────────────────────── */

function isGeoJSON(filePath) {
  const lower = filePath.toLowerCase();
  return lower.endsWith('.geojson') || lower.endsWith('.geojson.gz');
}

function isGzipped(filePath) {
  return filePath.toLowerCase().endsWith('.gz');
}

function createReadStream(filePath) {
  const raw = fs.createReadStream(filePath);
  if (isGzipped(filePath)) {
    return raw.pipe(zlib.createGunzip());
  }
  return raw;
}

/* ── row parser (normalizes CSV or GeoJSON to same shape) ────────── */

function parseGeoJSONRow(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed === '[' || trimmed === ']') return null;
  try {
    const feature = JSON.parse(trimmed.replace(/,\s*$/, ''));
    const coords = feature.geometry?.coordinates;
    const props = feature.properties || {};
    if (!coords || coords.length < 2) return null;
    const lon = coords[0];
    const lat = coords[1];
    const street = (props.street || '').trim();
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || !street) return null;
    return {
      number: props.number || null,
      street,
      unit: props.unit || null,
      city: props.city || null,
      region: props.region || null,
      postcode: props.postcode || null,
      lon,
      lat,
    };
  } catch {
    return null;
  }
}

/* ── import logic ────────────────────────────────────────────────── */

async function importFile(pool, filePath) {
  const geojson = isGeoJSON(filePath);
  const inputStream = createReadStream(filePath);
  const rl = readline.createInterface({ input: inputStream, crlfDelay: Infinity });
  let headers = null;
  let batch = [];
  let total = 0;
  let skipped = 0;

  for await (const line of rl) {
    let row;

    if (geojson) {
      row = parseGeoJSONRow(line);
      if (!row) { skipped++; continue; }
    } else {
      // CSV mode
      if (!headers) {
        headers = parseCSVLine(line).map((h) => h.toUpperCase());
        continue;
      }
      const cols = parseCSVLine(line);
      const raw = {};
      headers.forEach((h, i) => { raw[h] = cols[i] || ''; });

      const lon = parseFloat(raw.LON);
      const lat = parseFloat(raw.LAT);
      const street = (raw.STREET || '').trim();
      if (!Number.isFinite(lon) || !Number.isFinite(lat) || !street) {
        skipped++;
        continue;
      }
      row = {
        number: raw.NUMBER || null,
        street,
        unit: raw.UNIT || null,
        city: raw.CITY || null,
        region: raw.REGION || null,
        postcode: raw.POSTCODE || null,
        lon,
        lat,
      };
    }

    batch.push(row);

    if (batch.length >= BATCH_SIZE) {
      await insertBatch(pool, batch);
      total += batch.length;
      batch = [];
      if (total % LOG_EVERY === 0) {
        console.log(`  ${total.toLocaleString()} rows imported (${skipped.toLocaleString()} skipped)…`);
      }
    }
  }

  if (batch.length > 0) {
    await insertBatch(pool, batch);
    total += batch.length;
  }

  // Record import in log table
  await pool.query(
    'INSERT INTO address_import_log (source_file, record_count) VALUES ($1, $2)',
    [path.basename(filePath), total]
  );

  console.log(`  Done: ${total.toLocaleString()} imported, ${skipped.toLocaleString()} skipped from ${path.basename(filePath)}`);
  return total;
}

async function insertBatch(pool, rows) {
  const values = [];
  const placeholders = [];
  let idx = 1;
  for (const r of rows) {
    placeholders.push(
      `($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, ST_SetSRID(ST_MakePoint($${idx + 6}, $${idx + 7}), 4326))`
    );
    values.push(r.number, r.street, r.unit, r.city, r.region, r.postcode, r.lon, r.lat);
    idx += 8;
  }
  const sql = `INSERT INTO address_points (number, street, unit, city, region, postcode, geom) VALUES ${placeholders.join(', ')}`;
  await pool.query(sql, values);
}

/* ── CLI ─────────────────────────────────────────────────────────── */

async function main() {
  loadEnv();
  const args = process.argv.slice(2);
  let files = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      files.push(path.resolve(args[++i]));
    } else if (args[i] === '--dir' && args[i + 1]) {
      const dir = path.resolve(args[++i]);
      const entries = fs.readdirSync(dir).filter((f) =>
        f.endsWith('.csv') || f.endsWith('.geojson') || f.endsWith('.geojson.gz')
      );
      files.push(...entries.map((f) => path.join(dir, f)));
    }
  }

  if (files.length === 0) {
    console.error('Usage: node scripts/importOpenAddresses.js --file <path> | --dir <directory>');
    console.error('Supported formats: .csv, .geojson, .geojson.gz');
    process.exit(1);
  }

  const connectionString = (process.env.DATABASE_URL || '').trim();
  if (!connectionString) {
    console.error('DATABASE_URL not set. Set it in .env or the environment.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  let grandTotal = 0;

  try {
    for (const filePath of files) {
      const fmt = isGeoJSON(filePath) ? 'GeoJSON' : 'CSV';
      console.log(`Importing ${path.basename(filePath)} (${fmt})…`);
      grandTotal += await importFile(pool, filePath);
    }
    console.log(`\nAll done. ${grandTotal.toLocaleString()} total rows imported from ${files.length} file(s).`);
  } catch (err) {
    console.error('Import failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
