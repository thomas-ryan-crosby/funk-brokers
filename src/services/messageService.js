// Message Service - Postgres API only (Firestore removed)
import { getMessagesForUserApi, createMessageApi } from './messagesApiService';

export const createMessage = async ({ senderId, senderName, recipientId, recipientName, propertyId = null, propertyAddress = null, body }) => {
  return createMessageApi({ senderId, senderName, recipientId, recipientName, propertyId, propertyAddress, body });
};

export const getMessagesForUser = async (uid) => {
  return getMessagesForUserApi(uid);
};
