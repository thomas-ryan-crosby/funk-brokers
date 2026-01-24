/**
 * Backfill latitude/longitude for existing properties using Google Geocoding API.
 * Skips properties that already have lat/lng. Requires address, or city+state or zipCode.
 *
 * Run: GOOGLE_MAPS_API_KEY=your_key node scripts/backfillPropertyCoordinates.js
 * (Or set GOOGLE_MAPS_API_KEY in .env and load with dotenv if you use it.)
 */
const admin = require('firebase-admin');
const path = require('path');

const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  console.error('Set GOOGLE_MAPS_API_KEY or VITE_GOOGLE_MAPS_API_KEY');
  process.exit(1);
}

const serviceAccount = require(path.join(__dirname, '../firebase/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== 'OK' || !json.results?.[0]?.geometry?.location) return null;
  const { lat, lng } = json.results[0].geometry.location;
  return { latitude: lat, longitude: lng };
}

async function run() {
  const snap = await db.collection('properties').get();
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const d of snap.docs) {
    const data = d.data();
    const id = d.id;

    if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      skipped++;
      continue;
    }

    const address = [data.address, data.city, data.state, data.zipCode].filter(Boolean).join(', ');
    if (!address) {
      console.warn(`[${id}] no address fields, skip`);
      skipped++;
      continue;
    }

    try {
      const coords = await geocode(address);
      if (!coords) {
        console.warn(`[${id}] geocode returned no location for: ${address}`);
        failed++;
        await sleep(300);
        continue;
      }
      await d.ref.update({
        latitude: coords.latitude,
        longitude: coords.longitude,
        updatedAt: new Date(),
      });
      updated++;
      console.log(`[${id}] ${address} → ${coords.latitude}, ${coords.longitude}`);
    } catch (e) {
      console.error(`[${id}] ${e.message}`);
      failed++;
    }
    await sleep(250);
  }

  console.log(`Done. Updated: ${updated}, skipped: ${skipped}, failed: ${failed}`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
