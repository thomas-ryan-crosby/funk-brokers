function getBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/pre-listing-checklists`;
}
export async function getPreListingChecklistApi(propertyId) {
  if (!propertyId) return null;
  const res = await fetch(`${getBase()}?propertyId=${encodeURIComponent(propertyId)}`);
  if (!res.ok) throw new Error(`API: ${res.status}`);
  const data = await res.json();
  return data;
}
export async function savePreListingChecklistApi(propertyId, data) {
  const res = await fetch(getBase(), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyId, ...data }) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Save checklist: ${res.status}`);
  }
}
