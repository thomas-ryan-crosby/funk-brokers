/**
 * Property read/write via Postgres API.
 */

import { getListingTier } from '../utils/verificationScores';

function getBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/properties`;
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(res.status === 404 ? 'Property not found' : `Properties API: ${res.status}`);
  return res.json();
}

async function fetchJsonSafe(url, opts = {}) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function getAllPropertiesApi(limit = 75) {
  const url = `${getBase()}?limit=${limit}`;
  const { ok, data } = await fetchJsonSafe(url);
  if (!ok) return [];
  return Array.isArray(data?.properties) ? data.properties : [];
}

export async function getPropertiesBySellerApi(sellerId, limit = 100) {
  const url = `${getBase()}?sellerId=${encodeURIComponent(sellerId)}&limit=${limit}&includeArchived=true`;
  const { ok, data } = await fetchJsonSafe(url);
  if (!ok) return [];
  const list = Array.isArray(data?.properties) ? data.properties : [];
  list.sort((a, b) => {
    const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bDate - aDate;
  });
  return list;
}

export async function getPropertyByIdApi(propertyId) {
  const url = `${getBase()}?id=${encodeURIComponent(propertyId)}`;
  const data = await fetchJson(url);
  return data && typeof data === 'object' && data.id ? data : null;
}

export async function searchPropertiesApi(filters = {}) {
  const params = new URLSearchParams();
  params.set('limit', filters.limit || 75);
  if (filters.sellerId) params.set('sellerId', filters.sellerId);
  if (filters.listedStatus) params.set('listedStatus', filters.listedStatus);
  const url = `${getBase()}?${params}`;
  const { ok, data } = await fetchJsonSafe(url);
  if (!ok) return [];
  let list = Array.isArray(data?.properties) ? data.properties : [];
  if (filters.query && String(filters.query).trim()) {
    const q = String(filters.query).toLowerCase().trim();
    list = list.filter(
      (p) =>
        (p.address || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q) ||
        (p.state || '').toLowerCase().includes(q) ||
        (p.zipCode || '').toLowerCase().includes(q)
    );
  }
  if (filters.minPrice != null) list = list.filter((p) => (p.price ?? 0) >= Number(filters.minPrice));
  if (filters.maxPrice != null) list = list.filter((p) => (p.price ?? 0) <= Number(filters.maxPrice));
  if (filters.propertyType) {
    const types = Array.isArray(filters.propertyTypes) ? filters.propertyTypes : [filters.propertyType];
    if (types.length) list = list.filter((p) => types.includes(p.propertyType));
  }
  if (filters.minSquareFeet != null) list = list.filter((p) => (p.squareFeet ?? 0) >= Number(filters.minSquareFeet));
  if (filters.maxSquareFeet != null) list = list.filter((p) => (p.squareFeet ?? 0) <= Number(filters.maxSquareFeet));
  if (filters.bedrooms != null) list = list.filter((p) => (p.bedrooms ?? 0) >= parseInt(filters.bedrooms, 10));
  if (filters.bathrooms != null) list = list.filter((p) => (p.bathrooms ?? 0) >= parseFloat(filters.bathrooms));
  if (filters.city) list = list.filter((p) => (p.city || '').toLowerCase() === String(filters.city).toLowerCase());
  if (filters.state) list = list.filter((p) => (p.state || '').toUpperCase() === String(filters.state).toUpperCase());
  const tierList = Array.isArray(filters.propertyTiers) && filters.propertyTiers.length > 0
    ? filters.propertyTiers
    : filters.propertyTier && filters.propertyTier !== 'all'
      ? [filters.propertyTier]
      : null;
  if (tierList && tierList.length > 0) {
    list = list.filter((p) => tierList.includes(getListingTier(p)));
  }
  if (filters.communicationStatus === 'accepting') {
    list = list.filter((p) => p.acceptingCommunications !== false);
  } else if (filters.communicationStatus === 'not_accepting') {
    list = list.filter((p) => p.acceptingCommunications === false);
  }
  if (filters.showUnderContract === false) {
    list = list.filter((p) => p.status !== 'under_contract');
  }
  const orderBy = filters.orderBy || 'createdAt';
  const dir = filters.orderDirection || 'desc';
  list.sort((a, b) => {
    let aVal = a[orderBy];
    let bVal = b[orderBy];
    if (orderBy === 'createdAt') {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
      return dir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    aVal = aVal ?? 0;
    bVal = bVal ?? 0;
    return dir === 'asc' ? aVal - bVal : bVal - aVal;
  });
  if (filters.limit) list = list.slice(0, parseInt(filters.limit, 10));
  return list;
}

function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `prop_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export async function createPropertyApi(propertyData) {
  const id = propertyData.id || generateId();
  const payload = {
    ...propertyData,
    id,
    status: 'active',
    availableForSale: false,
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
    throw new Error(err.error || `Create failed: ${res.status}`);
  }
  const data = await res.json();
  return data.id ?? id;
}

export async function claimPropertyApi(parcel, sellerId) {
  const res = await fetch(getBase(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'claim', sellerId, parcel }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Claim failed: ${res.status}`);
  }
  const data = await res.json();
  return data.id;
}

export async function updatePropertyApi(propertyId, updates) {
  const res = await fetch(getBase(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: propertyId, ...updates }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Update failed: ${res.status}`);
  }
}

export async function deletePropertyApi(propertyId) {
  const res = await fetch(`${getBase()}?id=${encodeURIComponent(propertyId)}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Delete failed: ${res.status}`);
  }
}

export async function deletePropertyPermanentlyApi(propertyId) {
  const res = await fetch(getBase(), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: propertyId, permanent: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Permanent delete failed: ${res.status}`);
  }
}
