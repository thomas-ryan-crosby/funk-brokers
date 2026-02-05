// Profile Service - Postgres API only (Firestore removed)
import {
  getUserProfileApi,
  updateUserProfileApi,
  getSavedSearchesApi,
  addSavedSearchApi,
  removeSavedSearchApi,
} from './usersApiService';

export const getSaleProfile = async (userId) => {
  if (!userId) return null;
  try {
    const user = await getUserProfileApi(userId);
    if (!user || !user.saleProfile) return null;
    return { id: userId, ...user.saleProfile };
  } catch (err) {
    console.error('Error fetching sale profile:', err);
    throw err;
  }
};

export const setSaleProfile = async (userId, data) => {
  if (!userId) throw new Error('userId is required');
  try {
    const user = await getUserProfileApi(userId).catch(() => null);
    const existing = (user && user.saleProfile) ? user.saleProfile : {};
    await updateUserProfileApi(userId, {
      saleProfile: { ...existing, ...data, updatedAt: new Date() },
    });
  } catch (err) {
    console.error('Error saving sale profile:', err);
    throw err;
  }
};

export const getPurchaseProfile = async (userId) => {
  if (!userId) return null;
  try {
    const user = await getUserProfileApi(userId);
    if (!user || !user.purchaseProfile) return null;
    return { id: userId, ...user.purchaseProfile };
  } catch (err) {
    console.error('Error fetching purchase profile:', err);
    throw err;
  }
};

export const setPurchaseProfile = async (userId, data) => {
  if (!userId) throw new Error('userId is required');
  try {
    const user = await getUserProfileApi(userId).catch(() => null);
    const existing = (user && user.purchaseProfile) ? user.purchaseProfile : {};
    const merged = mergePayload(existing, { ...data, updatedAt: new Date() });
    await updateUserProfileApi(userId, { purchaseProfile: merged });
  } catch (err) {
    console.error('Error saving purchase profile:', err);
    throw err;
  }
};

export const updatePurchaseProfile = async (userId, data) => {
  if (!userId) throw new Error('userId is required');
  try {
    const user = await getUserProfileApi(userId).catch(() => null);
    const existing = (user && user.purchaseProfile) ? user.purchaseProfile : {};
    const merged = mergePayload(existing, { ...data, updatedAt: new Date() });
    await updateUserProfileApi(userId, {
      purchaseProfile: merged,
    });
  } catch (err) {
    console.error('Error updating purchase profile:', err);
    throw err;
  }
};

export const getSavedSearches = async (userId) => {
  if (!userId) return [];
  try {
    const list = await getSavedSearchesApi(userId);
    return list.map((s) => ({
      ...s,
      createdAt: s.createdAt,
    }));
  } catch (err) {
    console.error('Error fetching saved searches:', err);
    throw err;
  }
};

export const addSavedSearch = async (userId, { name, filters }) => {
  if (!userId) throw new Error('userId is required');
  const id = await addSavedSearchApi(userId, { name, filters });
  return id;
};

export const removeSavedSearch = async (searchId) => {
  if (!searchId) throw new Error('searchId is required');
  await removeSavedSearchApi(searchId);
};
