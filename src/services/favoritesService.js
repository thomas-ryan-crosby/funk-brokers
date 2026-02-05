// Favorites Service - Postgres API only (Firestore removed)
import {
  addToFavoritesApi,
  removeFromFavoritesApi,
  getFavoriteApi,
  getUserFavoriteIdsApi,
  getFavoriteCountForPropertyApi,
  getFavoritesForPropertyApi,
} from './favoritesApiService';
import { getUserProfile } from './authService';

export const addToFavorites = async (userId, propertyId) => {
  return addToFavoritesApi(userId, propertyId);
};

export const removeFromFavorites = async (userId, propertyId) => {
  await removeFromFavoritesApi(userId, propertyId);
};

export const getFavorite = async (userId, propertyId) => {
  return getFavoriteApi(userId, propertyId);
};

export const getUserFavoriteIds = async (userId) => {
  return getUserFavoriteIdsApi(userId);
};

export const isFavorited = async (userId, propertyId) => {
  const favorite = await getFavoriteApi(userId, propertyId);
  return !!favorite;
};

export const getFavoriteCountForProperty = async (propertyId) => {
  return getFavoriteCountForPropertyApi(propertyId);
};

export const getFavoritesForProperty = async (propertyId) => {
  return getFavoritesForPropertyApi(propertyId, getUserProfile);
};
