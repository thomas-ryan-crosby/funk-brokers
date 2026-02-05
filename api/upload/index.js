/**
 * POST /api/upload — upload file (body: { path, content: base64, contentType? })
 * Uses Vercel Blob if BLOB_READ_WRITE_TOKEN is set; otherwise returns 503.
 */

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseBody(req) {
  const raw = req.body;
  if (!raw) return {};
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = parseBody(req);
  } catch (_) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  const path = (body.path || '').trim();
  const content = body.content; // base64 string
  if (!path || content == null) {
    return res.status(400).json({ error: 'Missing path or content' });
  }

  try {
    const { put } = require('@vercel/blob');
    const buffer = Buffer.from(content, 'base64');
    const blob = await put(path, buffer, {
      access: 'public',
      contentType: body.contentType || undefined,
    });
    return res.status(200).json({ url: blob.url });
  } catch (err) {
    if (err.message && err.message.includes('BLOB_READ_WRITE_TOKEN')) {
      return res.status(503).json({ error: 'Upload not configured. Set BLOB_READ_WRITE_TOKEN.' });
    }
    console.warn('[api/upload]', err?.message || err);
    return res.status(500).json({ error: err?.message || 'Upload failed' });
  }
};
