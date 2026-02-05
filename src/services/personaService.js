// Persona service - Vercel API only (no Firebase Functions)

function getBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/persona/inquiry`;
}

export const createPersonaInquiry = async ({ name, dob, email, templateId }) => {
  const res = await fetch(getBase(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, dob, email, templateId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Persona: ${res.status}`);
  }
  return data.data || data;
};
