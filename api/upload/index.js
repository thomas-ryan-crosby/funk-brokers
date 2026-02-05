/**
 * POST /api/upload — Vercel Blob client uploads (token + completion callbacks).
 * Uses BLOB_READ_WRITE_TOKEN to mint short-lived client tokens.
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
  try {
    const { handleUpload } = require('@vercel/blob/client');
    const json = await handleUpload({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      request: req,
      body,
      onBeforeGenerateToken: async (pathname) => {
        return {
          pathname,
          access: 'public',
          allowedContentTypes: ['image/*', 'video/*', 'application/pdf'],
        };
      },
      onUploadCompleted: async () => {},
    });
    return res.status(200).json(json);
  } catch (err) {
    if (err.message && err.message.includes('BLOB_READ_WRITE_TOKEN')) {
      return res.status(503).json({ error: 'Upload not configured. Set BLOB_READ_WRITE_TOKEN.' });
    }
    console.warn('[api/upload]', err?.message || err);
    return res.status(500).json({ error: err?.message || 'Upload failed' });
  }
};
