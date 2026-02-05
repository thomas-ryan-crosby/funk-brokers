function getBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/feedback`;
}
export async function getFeedbackListApi(limitCount = 100) {
  const res = await fetch(`${getBase()}?limit=${limitCount}`);
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data.feedback) ? data.feedback : [];
}
export async function createFeedbackApi(data) {
  const id = data.id || `fb_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const res = await fetch(getBase(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, id }) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Create feedback: ${res.status}`);
  }
  const out = await res.json().catch(() => ({}));
  return out.id || id;
}
