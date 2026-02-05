/**
 * Messages via Postgres API (when USE_POSTGRES_FOR_ALL).
 */

function getBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/messages`;
}

function genId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export async function getMessagesForUserApi(uid) {
  try {
    const res = await fetch(`${getBase()}?userId=${encodeURIComponent(uid)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.messages) ? data.messages : [];
  } catch (_) {
    return [];
  }
}

export async function createMessageApi({ senderId, senderName, recipientId, recipientName, propertyId = null, propertyAddress = null, body }) {
  const res = await fetch(getBase(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: genId(),
      senderId,
      senderName: senderName || null,
      recipientId,
      recipientName: recipientName || null,
      propertyId: propertyId || null,
      propertyAddress: propertyAddress || null,
      body: String(body || '').trim(),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Create message failed: ${res.status}`);
  }
  const data = await res.json();
  return data.id;
}
