// Favorites Service - Manage user's favorite properties
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  limit,
  getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const FAVORITES_COLLECTION = 'favorites';

/**
 * Add a property to user's favorites
 */
export const addToFavorites = async (userId, propertyId) => {
  if (USE_POSTGRES_FOR_ALL) {
    return addToFavoritesApi(userId, propertyId);
  }
  try {
    const existing = await getFavorite(userId, propertyId);
    if (existing) return existing.id;
    const docRef = await addDoc(collection(db, FAVORITES_COLLECTION), {
      userId,
      propertyId,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding to favorites:', error);
    throw error;
  }
};

/**
 * Remove a property from user's favorites
 */
export const removeFromFavorites = async (userId, propertyId) => {
  try {
    const favorite = await getFavorite(userId, propertyId);
    if (favorite) {
      await deleteDoc(doc(db, FAVORITES_COLLECTION, favorite.id));
    }
  } catch (error) {
    console.error('Error removing from favorites:', error);
    throw error;
  }
};

/**
 * Get a specific favorite
 */
export const getFavorite = async (userId, propertyId) => {
  if (USE_POSTGRES_FOR_ALL) {
    return getFavoriteApi(userId, propertyId);
  }
  try {
    const q = query(
      collection(db, FAVORITES_COLLECTION),
      where('userId', '==', userId),
      where('propertyId', '==', propertyId)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const d = querySnapshot.docs[0];
      return { id: d.id, ...d.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting favorite:', error);
    throw error;
  }
};

const FAVORITES_QUERY_CAP = 200;
const FAVORITES_FOR_PROPERTY_CAP = 50;
const FAVORITES_USER_PROFILES_CAP = 20;

/**
 * Get all favorite property IDs for a user
 */
export const getUserFavoriteIds = async (userId) => {
  try {
    const q = query(
      collection(db, FAVORITES_COLLECTION),
      where('userId', '==', userId),
      limit(FAVORITES_QUERY_CAP)
    );
    const querySnapshot = await getDocs(q);
    const favoriteIds = [];
    querySnapshot.forEach((doc) => {
      favoriteIds.push(doc.data().propertyId);
    });
    return favoriteIds;
  } catch (error) {
    console.error('Error getting user favorites:', error);
    throw error;
  }
};

/**
 * Check if a property is favorited by user
 */
export const isFavorited = async (userId, propertyId) => {
  const favorite = await getFavorite(userId, propertyId);
  return !!favorite;
};

/**
 * Get the number of users who favorited a property
 */
export const getFavoriteCountForProperty = async (propertyId) => {
  if (USE_POSTGRES_FOR_ALL) {
    return getFavoriteCountForPropertyApi(propertyId);
  }
  try {
    const q = query(
      collection(db, FAVORITES_COLLECTION),
      where('propertyId', '==', propertyId)
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch (error) {
    console.error('Error getting favorite count:', error);
    return 0;
  }
};

/**
 * Get favorites for a property with user profile info
 */
export const getFavoritesForProperty = async (propertyId) => {
  if (USE_POSTGRES_FOR_ALL) {
    return getFavoritesForPropertyApi(propertyId, getUserProfile);
  }
  try {
    const q = query(
      collection(db, FAVORITES_COLLECTION),
      where('propertyId', '==', propertyId),
      limit(FAVORITES_FOR_PROPERTY_CAP)
    );
    const snap = await getDocs(q);
    const docsToHydrate = snap.docs.slice(0, FAVORITES_USER_PROFILES_CAP);
    const hydrated = await Promise.all(
      docsToHydrate.map(async (d) => {
        const fav = { id: d.id, ...d.data() };
        let userProfile = null;
        try {
          const userDoc = await getDoc(doc(db, 'users', fav.userId));
          if (userDoc.exists()) userProfile = { id: userDoc.id, ...userDoc.data() };
        } catch (e) {
          console.error('Error loading favorite user profile:', e);
        }
        return { ...fav, userProfile };
      })
    );
    const rest = snap.docs.slice(FAVORITES_USER_PROFILES_CAP).map((d) => ({ id: d.id, ...d.data(), userProfile: null }));
    const favorites = [...hydrated, ...rest];
    favorites.sort((a, b) => {
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return bDate - aDate;
    });
    return favorites;
  } catch (error) {
    console.error('Error getting favorites for property:', error);
    return [];
  }
};
