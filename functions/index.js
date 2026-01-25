const functions = require('firebase-functions');

const ATTOM_BASE = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0/allevents/snapshot';

/**
 * Compute radius in miles from bbox (n,s,e,w in degrees).
 * 69 miles per degree latitude; longitude scaled by cos(lat).
 * Clamped to 0.25–20 miles.
 */
function radiusFromBbox(n, s, e, w) {
  const centerLat = (n + s) / 2;
  const centerLng = (e + w) / 2;
  const latDeg = n - s;
  const lngDeg = Math.abs(e - w) * Math.cos((centerLat * Math.PI) / 180);
  const radiusMiles = 69 * 0.5 * Math.max(latDeg, lngDeg);
  return Math.max(0.25, Math.min(20, radiusMiles));
}

/**
 * Map ATTOM property to our parcel shape.
 */
function mapAttomToParcel(p, index) {
  const addr = p.address || {};
  const parts = [
    addr.line1 || addr.line2,
    addr.locality,
    addr.adminarea || addr.region,
    addr.postal1 || addr.postalcode
  ].filter(Boolean);
  const address = parts.length > 0 ? parts.join(', ') : 'Address unknown';

  const lat = p.location?.latitude ?? p.latitude;
  const lng = p.location?.longitude ?? p.longitude;
  if (lat == null || lng == null) return null;

  const avm = p.avm?.amount ?? p.avm;
  const estimate = avm?.value ?? avm?.amount ?? null;

  const sale = p.sale ?? {};
  const saleAmt = sale.amount?.saleAmt ?? sale.amount?.saleamt ?? sale.saleamt ?? sale.saleAmt ?? null;
  const saleDate = sale.saleSearchDate ?? sale.salesearchdate ?? sale.saleTransDate ?? sale.saletransdate ?? null;

  const rooms = p.building?.rooms ?? p.building ?? {};
  const beds = rooms.beds ?? p.beds ?? null;
  const baths = rooms.bathstotal ?? rooms.bathstotal ?? p.bathstotal ?? p.baths ?? null;
  const size = p.building?.size ?? p.building ?? {};
  const squareFeet = size.universalsize ?? size.buildingSize ?? size.buildingsize ?? p.squarefeet ?? null;

  const attomId = p.identifier?.Id ?? p.identifier?.id ?? p.id ?? p.attomId ?? `p-${index}`;

  return {
    address,
    latitude: Number(lat),
    longitude: Number(lng),
    estimate: estimate != null ? Number(estimate) : null,
    lastSalePrice: saleAmt != null ? Number(saleAmt) : null,
    lastSaleDate: saleDate != null ? String(saleDate) : null,
    attomId: String(attomId),
    beds: beds != null ? Number(beds) : null,
    baths: baths != null ? Number(baths) : null,
    squareFeet: squareFeet != null ? Number(squareFeet) : null
  };
}

/**
 * GET/POST getParcelsInViewport
 * Query/body: n, s, e, w (degrees)
 * Calls ATTOM allevents/snapshot with center + radius; returns { parcels } with CORS.
 */
const getParcelsInViewport = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  let n, s, e, w;
  if (req.method === 'POST' && req.body && typeof req.body === 'object') {
    n = req.body.n; s = req.body.s; e = req.body.e; w = req.body.w;
  } else {
    n = req.query.n; s = req.query.s; e = req.query.e; w = req.query.w;
  }
  n = parseFloat(n); s = parseFloat(s); e = parseFloat(e); w = parseFloat(w);
  if (!Number.isFinite(n) || !Number.isFinite(s) || !Number.isFinite(e) || !Number.isFinite(w)) {
    res.status(400).json({ error: 'Missing or invalid n,s,e,w' });
    return;
  }

  const apiKey = process.env.ATTOM_API_KEY || functions.config().attom?.api_key;
  if (!apiKey) {
    res.status(500).json({ error: 'ATTOM API key not configured' });
    return;
  }

  const centerLat = (n + s) / 2;
  const centerLng = (e + w) / 2;
  const radius = radiusFromBbox(n, s, e, w);

  const url = `${ATTOM_BASE}?latitude=${centerLat}&longitude=${centerLng}&radius=${radius}&radiusunit=miles`;
  let data;
  try {
    const r = await fetch(url, {
      headers: { Accept: 'application/json', APIKey: apiKey }
    });
    if (!r.ok) {
      const txt = await r.text();
      console.error('ATTOM API error', r.status, txt);
      res.status(502).json({ error: 'Upstream API error', details: txt.slice(0, 200) });
      return;
    }
    data = await r.json();
  } catch (err) {
    console.error('ATTOM fetch error', err);
    res.status(502).json({ error: 'Upstream request failed' });
    return;
  }

  const list = data.property ?? data.properties ?? data ?? [];
  const arr = Array.isArray(list) ? list : [list];
  const parcels = arr
    .map((p, i) => mapAttomToParcel(p, i))
    .filter(Boolean);

  res.json({ parcels });
});

exports.getParcelsInViewport = getParcelsInViewport;
