// Favorites Service - Manage user's favorite properties
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const FAVORITES_COLLECTION = 'favorites';

/**
 * Add a property to user's favorites
 */
export const addToFavorites = async (userId, propertyId) => {
  try {
    // Check if already favorited
    const existing = await getFavorite(userId, propertyId);
    if (existing) {
      return existing.id; // Already favorited
    }

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
  try {
    const q = query(
      collection(db, FAVORITES_COLLECTION),
      where('userId', '==', userId),
      where('propertyId', '==', propertyId)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting favorite:', error);
    throw error;
  }
};

/**
 * Get all favorite property IDs for a user
 */
export const getUserFavoriteIds = async (userId) => {
  try {
    const q = query(
      collection(db, FAVORITES_COLLECTION),
      where('userId', '==', userId)
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
