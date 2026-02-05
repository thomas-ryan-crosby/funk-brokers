function getBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/pings`;
}
export async function getPingsForSellerApi(sellerId) {
  const res = await fetch(`${getBase()}?sellerId=${encodeURIComponent(sellerId)}`);
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data.pings) ? data.pings : [];
}
export async function getPingsForSenderApi(senderId) {
  const res = await fetch(`${getBase()}?senderId=${encodeURIComponent(senderId)}`);
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data.pings) ? data.pings : [];
}
export async function createPingApi(payload) {
  const id = payload.id || `ping_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const res = await fetch(getBase(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, id }) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Create ping: ${res.status}`);
  }
  const data = await res.json().catch(() => ({}));
  return data.id || id;
}
