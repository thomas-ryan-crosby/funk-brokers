function getBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/vendors`;
}
async function parseRes(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `API: ${res.status}`);
  return data;
}
export async function getVendorsByUserApi(userId) {
  const res = await fetch(`${getBase()}?userId=${encodeURIComponent(userId)}`);
  const data = await parseRes(res);
  return Array.isArray(data.vendors) ? data.vendors : [];
}
export async function getVendorByIdApi(vendorId) {
  const res = await fetch(`${getBase()}?id=${encodeURIComponent(vendorId)}`);
  if (res.status === 404) return null;
  return parseRes(res);
}
export async function createVendorApi(userId, data) {
  const id = data.id || `ven_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const res = await fetch(getBase(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, id, userId }) });
  const out = await parseRes(res);
  return out.id || id;
}
export async function updateVendorApi(vendorId, data) {
  const res = await fetch(getBase(), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: vendorId, ...data }) });
  await parseRes(res);
}
export async function deleteVendorApi(vendorId) {
  const res = await fetch(getBase(), { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: vendorId }) });
  await parseRes(res);
}
