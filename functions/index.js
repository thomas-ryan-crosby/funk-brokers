const functions = require('firebase-functions');
const admin = require('firebase-admin');
const pdfParse = require('pdf-parse');

admin.initializeApp();

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

const parseCurrencyValues = (text) => {
  if (!text) return [];
  const results = [];
  const pattern = /(?:\$|usd\s*)\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\.\d{2})?/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const raw = match[1] || '';
    const normalized = raw.replace(/,/g, '');
    const value = Number.parseFloat(normalized);
    if (!Number.isNaN(value) && value >= 1000 && value <= 100000000) {
      results.push(value);
    }
  }
  return results;
};

const parseLooseAmounts = (text) => {
  if (!text) return [];
  const results = [];
  const pattern = /\b([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{5,})\b/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const raw = match[1] || '';
    const normalized = raw.replace(/,/g, '');
    const value = Number.parseFloat(normalized);
    if (!Number.isNaN(value) && value >= 1000 && value <= 100000000) {
      results.push(value);
    }
  }
  return results;
};

const parseKeywordAmounts = (text) => {
  if (!text) return [];
  const results = [];
  const keywords = [
    'approved',
    'pre-approval',
    'preapproval',
    'loan amount',
    'amount',
    'funds',
    'available',
    'verified',
    'credit',
  ];
  const lower = text.toLowerCase();
  for (const keyword of keywords) {
    const idx = lower.indexOf(keyword);
    if (idx === -1) continue;
    const windowText = text.slice(Math.max(0, idx - 40), idx + 160);
    results.push(...parseCurrencyValues(windowText));
    results.push(...parseLooseAmounts(windowText));
  }
  return results;
};

const parseDob = (text) => {
  if (!text) return null;
  const patterns = [
    /\b(?:dob|date of birth|birth)\b[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/i,
    /\b([0-9]{4}[\/\-][0-9]{1,2}[\/\-][0-9]{1,2})\b/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
};

const parseName = (text) => {
  if (!text) return null;
  const match = text.match(/\b(?:name|full name)\b[:\s]*([A-Z][A-Z'\- ]{2,})/i);
  if (match?.[1]) {
    return match[1].replace(/\s+/g, ' ').trim();
  }
  return null;
};

const extractTextFromPdf = async (buffer) => {
  const pdfParseFn = pdfParse.default || pdfParse;
  const parsed = await pdfParseFn(buffer);
  return (parsed.text || '').replace(/\s+/g, ' ').trim();
};

const extractTextFromImage = async (buffer) => {
  const { createWorker } = require('tesseract.js');
  const worker = await createWorker('eng');
  const { data } = await worker.recognize(buffer);
  await worker.terminate();
  return (data?.text || '').replace(/\s+/g, ' ').trim();
};

const isPdfBuffer = (buffer) => {
  if (!buffer || buffer.length < 4) return false;
  return buffer.slice(0, 4).toString() === '%PDF';
};

const isJpegBuffer = (buffer) => {
  if (!buffer || buffer.length < 3) return false;
  return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
};

const isPngBuffer = (buffer) => {
  if (!buffer || buffer.length < 8) return false;
  return buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
};

exports.extractDocumentData = functions.https.onCall(async (data) => {
  const { url, path, docType } = data || {};
  if ((!url || typeof url !== 'string') && (!path || typeof path !== 'string')) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing document url or path');
  }

  try {
    let buffer;
    let contentType = '';
    let urlLower = (url || '').toLowerCase();

    if (path) {
      try {
        const bucket = admin.storage().bucket();
        const file = bucket.file(path);
        const [metadata] = await file.getMetadata();
        contentType = metadata?.contentType || '';
        const [downloaded] = await file.download();
        buffer = downloaded;
      } catch (err) {
        console.error('Storage download failed, falling back to URL:', err);
      }
    }

    if (!buffer) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new functions.https.HttpsError('unavailable', 'Failed to fetch document');
      }
      contentType = response.headers.get('content-type') || '';
      urlLower = urlLower || url.toLowerCase();
      buffer = Buffer.from(await response.arrayBuffer());
    }

    let text = '';
    if (contentType.includes('pdf') || urlLower.includes('.pdf') || isPdfBuffer(buffer)) {
      text = await extractTextFromPdf(buffer);
    } else if (
      contentType.includes('image')
      || /\.(png|jpe?g)$/i.test(urlLower)
      || isJpegBuffer(buffer)
      || isPngBuffer(buffer)
    ) {
      try {
        text = await extractTextFromImage(buffer);
      } catch (err) {
        console.error('Image OCR failed:', err);
        text = '';
      }
    }

    const amountCandidates = [
      ...parseCurrencyValues(text),
      ...parseKeywordAmounts(text),
    ];
    const amount = amountCandidates.length ? Math.max(...amountCandidates) : null;

    const extractedName = docType === 'governmentId' ? parseName(text) : null;
    const extractedDob = docType === 'governmentId' ? parseDob(text) : null;

    return {
      amount,
      extractedName,
      extractedDob,
    };
  } catch (error) {
    console.error('Extraction error:', error);
    throw new functions.https.HttpsError('internal', 'Extraction failed');
  }
});
