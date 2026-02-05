/**
 * Transactions via Postgres API.
 */

function getBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/transactions`;
}

async function fetchJsonSafe(url, opts = {}) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export async function getTransactionByOfferIdApi(offerId) {
  const url = `${getBase()}?offerId=${encodeURIComponent(offerId)}`;
  const { ok, data } = await fetchJsonSafe(url);
  if (!ok) return null;
  return data ?? null;
}

export async function getTransactionsByUserApi(userId) {
  const url = `${getBase()}?userId=${encodeURIComponent(userId)}`;
  const { ok, data } = await fetchJsonSafe(url);
  if (!ok) return [];
  return Array.isArray(data?.transactions) ? data.transactions : [];
}

export async function getTransactionByIdApi(transactionId) {
  const url = `${getBase()}?id=${encodeURIComponent(transactionId)}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Transactions API: ${res.status}`);
  return res.json();
}

export async function createTransactionApi(payload) {
  const id = payload.id || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const res = await fetch(getBase(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, id }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Create transaction failed: ${res.status}`);
  }
  const data = await res.json().catch(() => ({}));
  return data?.id ?? id;
}

export async function updateStepCompleteApi(transactionId, stepId, completed) {
  const current = await getTransactionByIdApi(transactionId);
  if (!current || !current.steps) throw new Error('Transaction or steps not found');
  const steps = current.steps.map((s) =>
    s.id === stepId
      ? { ...s, completed: !!completed, completedAt: completed ? new Date() : null }
      : s
  );
  const res = await fetch(getBase(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: transactionId, steps }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Update step failed: ${res.status}`);
  }
}

export async function setAssignedVendorApi(transactionId, role, vendorId) {
  const current = await getTransactionByIdApi(transactionId);
  if (!current) throw new Error('Transaction not found');
  const list = (current.assignedVendors || []).filter((a) => a.role !== role);
  if (vendorId) list.push({ vendorId, role });
  const res = await fetch(getBase(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: transactionId, assignedVendors: list }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Set vendor failed: ${res.status}`);
  }
}
