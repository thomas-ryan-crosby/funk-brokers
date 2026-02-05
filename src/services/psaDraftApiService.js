function getBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/psa-drafts`;
}
async function parseRes(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `API: ${res.status}`);
  return data;
}
export async function getPsaDraftsByBuyerApi(buyerId) {
  const res = await fetch(`${getBase()}?buyerId=${encodeURIComponent(buyerId)}`);
  const data = await parseRes(res);
  return Array.isArray(data.drafts) ? data.drafts : [];
}
export async function getPsaDraftByIdApi(draftId) {
  const res = await fetch(`${getBase()}?id=${encodeURIComponent(draftId)}`);
  if (res.status === 404) return null;
  return parseRes(res);
}
export async function savePsaDraftApi(payload, draftId = null) {
  if (draftId) {
    const res = await fetch(getBase(), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draftId, ...payload }) });
    await parseRes(res);
    return draftId;
  }
  const id = payload.id || `psa_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const res = await fetch(getBase(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, id }) });
  const data = await parseRes(res);
  return data.id || id;
}
export async function deletePsaDraftApi(draftId) {
  const res = await fetch(getBase(), { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draftId }) });
  await parseRes(res);
}
