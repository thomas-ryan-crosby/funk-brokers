const functions = require('firebase-functions');

const ATTOM_BASE = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0/allevents/snapshot';
const PERSONA_BASE = 'https://api.withpersona.com/api/v1';
const PERSONA_VERSION = '2025-10-27';

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

  // ATTOM radius is always in miles; radiusunit is not a valid parameter.
  const url = `${ATTOM_BASE}?latitude=${centerLat}&longitude=${centerLng}&radius=${radius}`;
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

const getPersonaConfig = (templateOverride) => {
  const apiKey = process.env.PERSONA_API_KEY || functions.config().persona?.api_key;
  const templateId = process.env.PERSONA_TEMPLATE_ID || functions.config().persona?.template_id || templateOverride;
  if (!apiKey || !templateId) {
    throw new functions.https.HttpsError('failed-precondition', 'Persona API key or template ID not configured.');
  }
  return { apiKey, templateId };
};

const personaHeaders = (apiKey) => ({
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  'Persona-Version': PERSONA_VERSION,
});

const pickNameParts = (fullName) => {
  const tokens = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return {};
  const first = tokens[0];
  const last = tokens.length > 1 ? tokens[tokens.length - 1] : '';
  const middle = tokens.length > 2 ? tokens.slice(1, -1).join(' ') : '';
  return { first, middle, last };
};

const findOpenInquiry = async (apiKey, referenceId) => {
  const params = new URLSearchParams({
    'filter[reference-id]': referenceId,
    'filter[status]': 'created,pending',
    'page[size]': '1',
  });
  const response = await fetch(`${PERSONA_BASE}/inquiries?${params.toString()}`, {
    method: 'GET',
    headers: personaHeaders(apiKey),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Persona list inquiries failed: ${response.status} ${body}`);
  }
  const payload = await response.json();
  return payload?.data?.[0] || null;
};

const createInquiry = async (apiKey, templateId, referenceId, fields) => {
  const payload = {
    data: {
      attributes: {
        'inquiry-template-id': templateId,
        'reference-id': referenceId,
        fields,
      },
    },
  };
  const response = await fetch(`${PERSONA_BASE}/inquiries`, {
    method: 'POST',
    headers: personaHeaders(apiKey),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Persona create inquiry failed: ${response.status} ${body}`);
  }
  const payloadResponse = await response.json();
  return {
    data: payloadResponse?.data || null,
    meta: payloadResponse?.meta || null,
  };
};

const resumeInquiry = async (apiKey, inquiryId) => {
  const response = await fetch(`${PERSONA_BASE}/inquiries/${inquiryId}/resume`, {
    method: 'POST',
    headers: personaHeaders(apiKey),
    body: JSON.stringify({ meta: {} }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Persona resume inquiry failed: ${response.status} ${body}`);
  }
  const payload = await response.json();
  return payload?.meta?.['session-token'] || null;
};

exports.createPersonaInquiry = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }

  const templateOverride = data?.templateId || null;
  const { apiKey, templateId } = getPersonaConfig(templateOverride);
  const referenceId = context.auth.uid;
  const name = data?.name || '';
  const birthdate = data?.dob || null;
  const email = data?.email || null;
  const { first, middle, last } = pickNameParts(name);

  const fields = {
    ...(first ? { 'name-first': first } : {}),
    ...(middle ? { 'name-middle': middle } : {}),
    ...(last ? { 'name-last': last } : {}),
    ...(birthdate ? { birthdate } : {}),
    ...(email ? { 'email-address': email } : {}),
  };

  try {
    const existing = await findOpenInquiry(apiKey, referenceId);
    if (existing) {
      const status = existing?.attributes?.status || 'created';
      const inquiryId = existing?.id;
      const sessionToken = status === 'pending' ? await resumeInquiry(apiKey, inquiryId) : null;
      return { inquiryId, status, sessionToken };
    }

    const created = await createInquiry(apiKey, templateId, referenceId, fields);
    const inquiryId = created?.data?.id || null;
    const status = created?.data?.attributes?.status || 'created';
    const hostedLink = created?.meta?.['one-time-link'] || created?.meta?.['one-time-link-short'] || null;
    return { inquiryId, status, sessionToken: null, hostedLink };
  } catch (error) {
    console.error('Persona inquiry error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create Persona inquiry.');
  }
});
