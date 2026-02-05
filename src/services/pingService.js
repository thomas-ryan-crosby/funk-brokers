// Ping service - Postgres API only (Firestore removed)
import { createPingApi, getPingsForSellerApi, getPingsForSenderApi } from './pingApiService';

export const createPing = async ({ propertyId, propertyAddress, sellerId, senderId, senderName, reasonType, note }) => {
  if (!propertyId || !sellerId || !senderId) throw new Error('Missing ping fields');
  return createPingApi({
    propertyId,
    propertyAddress: propertyAddress || null,
    sellerId,
    senderId,
    senderName: senderName || 'Anonymous',
    reasonType,
    note: note ? String(note).trim() : null,
    status: 'new',
  });
};

export const getPingsForSeller = async (sellerId) => {
  if (!sellerId) return [];
  return getPingsForSellerApi(sellerId);
};

export const getPingsForSender = async (senderId) => {
  if (!senderId) return [];
  return getPingsForSenderApi(senderId);
};
