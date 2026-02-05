/**
 * Offers via Postgres API (when USE_POSTGRES_FOR_ALL).
 */

function getBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/offers`;
}

async function fetchJsonSafe(url, opts = {}) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export async function getOffersByPropertyApi(propertyId) {
  const url = `${getBase()}?propertyId=${encodeURIComponent(propertyId)}`;
  const { ok, data } = await fetchJsonSafe(url);
  if (!ok) return [];
  return Array.isArray(data?.offers) ? data.offers : [];
}

export async function getOffersByBuyerApi(buyerId) {
  const url = `${getBase()}?buyerId=${encodeURIComponent(buyerId)}`;
  const { ok, data } = await fetchJsonSafe(url);
  if (!ok) return [];
  return Array.isArray(data?.offers) ? data.offers : [];
}

export async function getOfferByIdApi(offerId) {
  const url = `${getBase()}?id=${encodeURIComponent(offerId)}`;
  const res = await fetch(url);
  if (res.status === 404) throw new Error('Offer not found');
  if (!res.ok) throw new Error(`Offers API: ${res.status}`);
  return res.json();
}

function genId() {
  return `off_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export async function createOfferApi(offerData) {
  const id = offerData.id || genId();
  const payload = {
    ...offerData,
    id,
    status: offerData.status || 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const res = await fetch(getBase(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Create offer failed: ${res.status}`);
  }
  const data = await res.json();
  return data.id ?? id;
}

export async function updateOfferStatusApi(offerId, status, additionalData = {}) {
  const res = await fetch(getBase(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: offerId, status, ...additionalData }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Update offer failed: ${res.status}`);
  }
}
