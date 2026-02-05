/**
 * Listing progress via Postgres API.
 */

function getBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/listing-progress`;
}

export async function getListingProgressApi(propertyId) {
  if (!propertyId) return null;
  const url = `${getBase()}?propertyId=${encodeURIComponent(propertyId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Listing progress API: ${res.status}`);
  const data = await res.json();
  return data; // null or { id, propertyId, step, formData, completedSteps, updatedAt }
}

export async function saveListingProgressApi(propertyId, progressData) {
  if (!propertyId) throw new Error('propertyId is required');
  const res = await fetch(getBase(), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      propertyId,
      step: progressData.step,
      formData: progressData.formData ?? {},
      completedSteps: progressData.completedSteps ?? [],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Save listing progress: ${res.status}`);
  }
}

export async function deleteListingProgressApi(propertyId) {
  if (!propertyId) return;
  const res = await fetch(getBase(), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ propertyId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Delete listing progress: ${res.status}`);
  }
}
