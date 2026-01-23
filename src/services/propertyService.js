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
 * Note: Firestore has limitations on compound queries. For complex filters,
 * we fetch all active properties and filter client-side.
 * For production, consider using Algolia or similar search service.
 */
export const searchProperties = async (filters = {}) => {
  try {
    // Start with base query for active properties
    let q = query(
      collection(db, PROPERTIES_COLLECTION),
      where('status', '==', 'active')
    );

    // Apply simple filters that work with single where clause
    // For complex queries, we'll filter client-side
    const orderByField = filters.orderBy || 'createdAt';
    const orderDirection = filters.orderDirection || 'desc';
    
    // Only add orderBy if it's not a range query on the same field
    if (orderByField !== 'price' || (!filters.minPrice && !filters.maxPrice)) {
      q = query(q, orderBy(orderByField, orderDirection));
    }

    // Limit results
    if (filters.limit) {
      q = query(q, limit(filters.limit));
    }

    const querySnapshot = await getDocs(q);
    let properties = [];
    querySnapshot.forEach((doc) => {
      properties.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Apply client-side filtering for complex queries
    if (filters.minPrice) {
      properties = properties.filter((p) => p.price >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      properties = properties.filter((p) => p.price <= parseFloat(filters.maxPrice));
    }
    if (filters.propertyType) {
      properties = properties.filter((p) => p.propertyType === filters.propertyType);
    }
    if (filters.bedrooms) {
      properties = properties.filter((p) => p.bedrooms >= parseInt(filters.bedrooms));
    }
    if (filters.bathrooms) {
      properties = properties.filter((p) => p.bathrooms >= parseFloat(filters.bathrooms));
    }
    if (filters.city) {
      properties = properties.filter(
        (p) => p.city?.toLowerCase() === filters.city.toLowerCase()
      );
    }
    if (filters.state) {
      properties = properties.filter(
        (p) => p.state?.toUpperCase() === filters.state.toUpperCase()
      );
    }

    // Sort client-side if needed (for price with range filters)
    if (orderByField === 'price' && (filters.minPrice || filters.maxPrice)) {
      properties.sort((a, b) => {
        const aVal = a[orderByField] || 0;
        const bVal = b[orderByField] || 0;
        return orderDirection === 'asc' ? aVal - bVal : bVal - aVal;
      });
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
