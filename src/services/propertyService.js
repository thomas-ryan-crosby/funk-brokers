// Property Service - Firestore operations for properties
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const PROPERTIES_COLLECTION = 'properties';

/**
 * Create a new property listing
 */
export const createProperty = async (propertyData) => {
  try {
    const docRef = await addDoc(collection(db, PROPERTIES_COLLECTION), {
      ...propertyData,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active', // active, under_contract, sold, withdrawn
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating property:', error);
    throw error;
  }
};

/**
 * Get all active properties
 */
export const getAllProperties = async () => {
  try {
    const q = query(
      collection(db, PROPERTIES_COLLECTION),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const properties = [];
    querySnapshot.forEach((doc) => {
      properties.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    return properties;
  } catch (error) {
    console.error('Error fetching properties:', error);
    throw error;
  }
};

/**
 * Get a single property by ID
 */
export const getPropertyById = async (propertyId) => {
  try {
    const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    } else {
      throw new Error('Property not found');
    }
  } catch (error) {
    console.error('Error fetching property:', error);
    throw error;
  }
};

/**
 * Search properties with filters
 */
export const searchProperties = async (filters = {}) => {
  try {
    let q = query(collection(db, PROPERTIES_COLLECTION), where('status', '==', 'active'));

    // Apply filters
    if (filters.minPrice) {
      q = query(q, where('price', '>=', filters.minPrice));
    }
    if (filters.maxPrice) {
      q = query(q, where('price', '<=', filters.maxPrice));
    }
    if (filters.propertyType) {
      q = query(q, where('propertyType', '==', filters.propertyType));
    }
    if (filters.bedrooms) {
      q = query(q, where('bedrooms', '>=', filters.bedrooms));
    }
    if (filters.bathrooms) {
      q = query(q, where('bathrooms', '>=', filters.bathrooms));
    }
    if (filters.city) {
      q = query(q, where('city', '==', filters.city));
    }
    if (filters.state) {
      q = query(q, where('state', '==', filters.state));
    }

    // Order by
    const orderByField = filters.orderBy || 'createdAt';
    const orderDirection = filters.orderDirection || 'desc';
    q = query(q, orderBy(orderByField, orderDirection));

    // Limit results
    if (filters.limit) {
      q = query(q, limit(filters.limit));
    }

    const querySnapshot = await getDocs(q);
    const properties = [];
    querySnapshot.forEach((doc) => {
      properties.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    return properties;
  } catch (error) {
    console.error('Error searching properties:', error);
    throw error;
  }
};

/**
 * Update a property
 */
export const updateProperty = async (propertyId, updates) => {
  try {
    const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating property:', error);
    throw error;
  }
};

/**
 * Delete a property (soft delete by setting status to withdrawn)
 */
export const deleteProperty = async (propertyId) => {
  try {
    await updateProperty(propertyId, { status: 'withdrawn' });
  } catch (error) {
    console.error('Error deleting property:', error);
    throw error;
  }
};
