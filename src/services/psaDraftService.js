// PSA draft service - Postgres API only (Firestore removed)
import { savePsaDraftApi, getPsaDraftsByBuyerApi, getPsaDraftByIdApi, deletePsaDraftApi } from './psaDraftApiService';

function sanitize(obj) {
  if (obj === undefined) return undefined;
  if (obj === null) return null;
  if (Array.isArray(obj)) return obj.map(sanitize).filter((v) => v !== undefined);
  if (typeof obj === 'object' && obj !== null && !(obj instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      const s = sanitize(v);
      if (s !== undefined) out[k] = s;
    }
    return out;
  }
  return obj;
}

export const savePsaDraft = async (data, draftId = null) => {
  const payload = sanitize({
    propertyId: data.propertyId,
    buyerId: data.buyerId,
    agreement: data.agreement,
    sourceLoiOfferId: data.sourceLoiOfferId ?? null,
    sourceLoi: data.sourceLoi ?? null,
  });
  return savePsaDraftApi(payload, draftId);
};

export const getPsaDraftsByBuyer = async (buyerId) => {
  return getPsaDraftsByBuyerApi(buyerId);
};

export const getPsaDraftById = async (draftId) => {
  return getPsaDraftByIdApi(draftId);
};

export const deletePsaDraft = async (draftId) => {
  await deletePsaDraftApi(draftId);
};
