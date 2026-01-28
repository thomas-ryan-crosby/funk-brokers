// Property Service - Firestore operations for properties
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
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
      availableForSale: false, // adding to platform does not list for sale; owner turns on when ready
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating property:', error);
    throw error;
  }
};

/**
 * Get all active properties
 * Note: Firestore requires a composite index for queries with where + orderBy on different fields
 * For now, we'll fetch all and sort client-side to avoid index requirement
 */
export const getAllProperties = async () => {
  try {
    // Get all properties that could be shown (active, under_contract, or not_listed with availableForSale)
    // We'll fetch all and filter client-side since Firestore doesn't support OR queries easily
    const allPropertiesQuery = collection(db, PROPERTIES_COLLECTION);
    const querySnapshot = await getDocs(allPropertiesQuery);
    
    const properties = [];
    querySnapshot.forEach((doc) => {
      properties.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    // Filter to only show properties that should be visible:
    // 1. Not archived
    // 2. availableForSale is true (or missing for backward compat)
    // 3. Status is 'active', 'under_contract', or 'not_listed' (if availableForSale is true)
    const visibleProperties = properties.filter((p) => {
      if (p.archived === true) return false;
      if (p.availableForSale === false) return false;
      
      // Include active, under_contract, or not_listed (if availableForSale is true)
      const validStatuses = ['active', 'under_contract'];
      if (p.status === 'not_listed' && p.availableForSale !== false) {
        validStatuses.push('not_listed');
      }
      return validStatuses.includes(p.status);
    });
    
    // Sort client-side by createdAt (newest first)
    visibleProperties.sort((a, b) => {
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return bDate - aDate; // Descending order
    });

    return visibleProperties;
  } catch (error) {
    console.error('Error fetching properties:', error);
    throw error;
  }
};

/**
 * Get all properties by a specific seller (includes archived; caller may split)
 */
export const getPropertiesBySeller = async (sellerId) => {
  try {
    const q = query(
      collection(db, PROPERTIES_COLLECTION),
      where('sellerId', '==', sellerId)
    );
    const querySnapshot = await getDocs(q);
    const properties = [];
    querySnapshot.forEach((doc) => {
      properties.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    // Sort by createdAt (newest first)
    properties.sort((a, b) => {
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return bDate - aDate;
    });
    
    return properties;
  } catch (error) {
    console.error('Error fetching seller properties:', error);
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
 * Fetches all active properties, then filters and sorts client-side to avoid
 * Firestore composite index requirements. For production, consider Algolia or similar.
 */
export const searchProperties = async (filters = {}) => {
  try {
    // Get all properties and filter client-side (since Firestore doesn't support OR queries easily)
    const allPropertiesQuery = collection(db, PROPERTIES_COLLECTION);
    const querySnapshot = await getDocs(allPropertiesQuery);
    
    let properties = [];
    querySnapshot.forEach((doc) => {
      properties.push({ id: doc.id, ...doc.data() });
    });

    // Filter to only show properties that should be visible:
    // 1. Not archived
    // 2. availableForSale is true (or missing for backward compat)
    // 3. Status is 'active', 'under_contract', or 'not_listed' (if availableForSale is true)
    properties = properties.filter((p) => {
      if (p.archived === true) return false;
      if (p.availableForSale === false) return false;
      
      // Include active, under_contract, or not_listed (if availableForSale is true)
      const validStatuses = ['active', 'under_contract'];
      if (p.status === 'not_listed' && p.availableForSale !== false) {
        validStatuses.push('not_listed');
      }
      return validStatuses.includes(p.status);
    });
    
    // Filter out under contract properties if showUnderContract is false
    if (filters.showUnderContract === false) {
      properties = properties.filter((p) => p.status !== 'under_contract');
    }

    // Client-side: query (substring on address, city, state, zipCode)
    if (filters.query && String(filters.query).trim()) {
      const q = String(filters.query).toLowerCase().trim();
      properties = properties.filter(
        (p) =>
          (p.address || '').toLowerCase().includes(q) ||
          (p.city || '').toLowerCase().includes(q) ||
          (p.state || '').toLowerCase().includes(q) ||
          (p.zipCode || '').toLowerCase().includes(q)
      );
    }
    if (filters.minPrice) {
      properties = properties.filter((p) => (p.price ?? 0) >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      properties = properties.filter((p) => (p.price ?? 0) <= parseFloat(filters.maxPrice));
    }
    if (filters.propertyType) {
      properties = properties.filter((p) => p.propertyType === filters.propertyType);
    }
    if (filters.bedrooms) {
      properties = properties.filter((p) => (p.bedrooms ?? 0) >= parseInt(filters.bedrooms, 10));
    }
    if (filters.bathrooms) {
      properties = properties.filter((p) => (p.bathrooms ?? 0) >= parseFloat(filters.bathrooms));
    }
    if (filters.city) {
      properties = properties.filter(
        (p) => (p.city || '').toLowerCase() === String(filters.city).toLowerCase()
      );
    }
    if (filters.state) {
      properties = properties.filter(
        (p) => (p.state || '').toUpperCase() === String(filters.state).toUpperCase()
      );
    }

    // Sort client-side
    const orderByField = filters.orderBy || 'createdAt';
    const orderDirection = filters.orderDirection || 'desc';
    properties.sort((a, b) => {
      let aVal = a[orderByField];
      let bVal = b[orderByField];
      if (orderByField === 'createdAt') {
        aVal = aVal?.toDate ? aVal.toDate() : new Date(aVal || 0);
        bVal = bVal?.toDate ? bVal.toDate() : new Date(bVal || 0);
        return orderDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      aVal = aVal ?? 0;
      bVal = bVal ?? 0;
      return orderDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    if (filters.limit) {
      properties = properties.slice(0, parseInt(filters.limit, 10));
    }

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

/**
 * Archive a property (hidden from browse; can be restored)
 */
export const archiveProperty = async (propertyId) => {
  try {
    await updateProperty(propertyId, { archived: true });
  } catch (error) {
    console.error('Error archiving property:', error);
    throw error;
  }
};

/**
 * Restore an archived property
 */
export const restoreProperty = async (propertyId) => {
  try {
    await updateProperty(propertyId, { archived: false });
  } catch (error) {
    console.error('Error restoring property:', error);
    throw error;
  }
};

/**
 * Permanently delete a property (removes from Firestore; cannot be undone)
 */
export const deletePropertyPermanently = async (propertyId) => {
  try {
    const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error permanently deleting property:', error);
    throw error;
  }
};
