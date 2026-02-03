const functions = require('firebase-functions');

const {
  getMapParcels,
  resolveAddress,
  getPropertySnapshot,
} = require('./attomService');
const PERSONA_BASE = 'https://api.withpersona.com/api/v1';
const PERSONA_VERSION = '2025-10-27';

/**
 * GET/POST getMapParcels
 * Query/body: n, s, e, w, zoom
 */
const getMapParcelsEndpoint = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  let n, s, e, w, zoom;
  if (req.method === 'POST' && req.body && typeof req.body === 'object') {
    n = req.body.n; s = req.body.s; e = req.body.e; w = req.body.w; zoom = req.body.zoom;
  } else {
    n = req.query.n; s = req.query.s; e = req.query.e; w = req.query.w; zoom = req.query.zoom;
  }
  n = parseFloat(n); s = parseFloat(s); e = parseFloat(e); w = parseFloat(w); zoom = parseInt(zoom, 10);
  if (!Number.isFinite(n) || !Number.isFinite(s) || !Number.isFinite(e) || !Number.isFinite(w) || !Number.isFinite(zoom)) {
    res.status(400).json({ error: 'Missing or invalid n,s,e,w,zoom' });
    return;
  }
  const requesterKey = req.headers['x-forwarded-for'] || req.ip || 'unknown';
  const metrics = { firestoreReads: 0, firestoreWrites: 0, attomCalls: 0 };
  const startMs = Date.now();
  try {
    const result = await getMapParcels({
      bounds: { n, s, e, w },
      zoom,
      requesterKey,
      metrics,
    });
    const latencyMs = Date.now() - startMs;
    console.log(JSON.stringify({ route: 'getMapParcels', latencyMs, ...metrics }));
    res.json(result);
  } catch (err) {
    console.error('Map parcels error', err);
    res.status(502).json({ error: 'Upstream request failed' });
  }
});

/**
 * POST resolveAddress
 * Body: { address, n, s, e, w }
 */
const resolveAddressEndpoint = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { address, n, s, e, w } = req.body || {};
  if (!address) {
    res.status(400).json({ error: 'Missing address' });
    return;
  }
  const bounds = {
    n: parseFloat(n),
    s: parseFloat(s),
    e: parseFloat(e),
    w: parseFloat(w),
  };
  if (!Number.isFinite(bounds.n) || !Number.isFinite(bounds.s) || !Number.isFinite(bounds.e) || !Number.isFinite(bounds.w)) {
    res.status(400).json({ error: 'Missing bounds' });
    return;
  }
  const metrics = { firestoreReads: 0, firestoreWrites: 0, attomCalls: 0 };
  const startMs = Date.now();
  try {
    const result = await resolveAddress({ address, bounds, metrics });
    const latencyMs = Date.now() - startMs;
    console.log(JSON.stringify({ route: 'resolveAddress', latencyMs, ...metrics }));
    res.json(result || { attomId: null, parcel: null });
  } catch (err) {
    console.error('Resolve address error', err);
    res.status(502).json({ error: 'Upstream request failed' });
  }
});

/**
 * GET propertySnapshot
 * Query: attomId, lat, lng
 */
const getPropertySnapshotEndpoint = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  const attomId = req.query.attomId;
  const latitude = parseFloat(req.query.lat);
  const longitude = parseFloat(req.query.lng);
  if (!attomId) {
    res.status(400).json({ error: 'Missing attomId' });
    return;
  }
  const metrics = { firestoreReads: 0, firestoreWrites: 0, attomCalls: 0 };
  const startMs = Date.now();
  try {
    const result = await getPropertySnapshot({ attomId, latitude, longitude, metrics });
    const latencyMs = Date.now() - startMs;
    console.log(JSON.stringify({ route: 'getPropertySnapshot', latencyMs, ...metrics }));
    res.json(result || { payload: null });
  } catch (err) {
    console.error('Property snapshot error', err);
    res.status(502).json({ error: 'Upstream request failed' });
  }
});

exports.getMapParcels = getMapParcelsEndpoint;
exports.resolveAddress = resolveAddressEndpoint;
exports.getPropertySnapshot = getPropertySnapshotEndpoint;

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

const generateOneTimeLink = async (apiKey, inquiryId) => {
  const response = await fetch(`${PERSONA_BASE}/inquiries/${inquiryId}/generate-one-time-link`, {
    method: 'POST',
    headers: personaHeaders(apiKey),
    body: JSON.stringify({ meta: {} }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Persona generate one-time link failed: ${response.status} ${body}`);
  }
  const payload = await response.json();
  return payload?.meta?.['one-time-link'] || payload?.meta?.['one-time-link-short'] || null;
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
      const hostedLink = await generateOneTimeLink(apiKey, inquiryId);
      return { inquiryId, status, sessionToken, hostedLink };
    }

    const created = await createInquiry(apiKey, templateId, referenceId, fields);
    const inquiryId = created?.data?.id || null;
    const status = created?.data?.attributes?.status || 'created';
    const hostedLink = created?.meta?.['one-time-link'] || created?.meta?.['one-time-link-short'] || null
      || (inquiryId ? await generateOneTimeLink(apiKey, inquiryId) : null);
    return { inquiryId, status, sessionToken: null, hostedLink };
  } catch (error) {
    console.error('Persona inquiry error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create Persona inquiry.');
  }
});
