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
import { getOffersByProperty } from './offerService';
import { getListingTier } from '../utils/verificationScores';
import { get as cacheGet, set as cacheSet, remove as cacheRemove } from '../utils/ttlCache';
import { FIRESTORE_READ_KILL_SWITCH } from '../config/featureFlags';
import metrics from '../utils/metrics';

const PROPERTIES_COLLECTION = 'properties';
const PROPERTIES_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min – reduce refetch volume (emergency read cap)

/**
 * Create a new property listing (full listing workflow)
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
 * Claim a property (simple one-step: "I own or have authority"). Creates minimal property
 * and adds it to the user's dashboard. No pre-listing checklist or full listing flow.
 * @param {object} parcel - { address?, latitude?, longitude?, beds?, baths?, squareFeet?, estimate? }
 * @param {string} sellerId - current user uid
 * @returns {Promise<string>} new property id
 */
export const claimProperty = async (parcel, sellerId) => {
  if (!sellerId) throw new Error('User ID required to claim property');
  const now = new Date();
  const data = {
    sellerId,
    address: parcel?.address || 'Address unknown',
    latitude: parcel?.latitude ?? null,
    longitude: parcel?.longitude ?? null,
    attomId: parcel?.attomId ?? null,
    city: '',
    state: '',
    zipCode: '',
    propertyType: parcel?.propertyType ?? '',
    bedrooms: parcel?.beds != null && Number.isFinite(Number(parcel.beds)) ? Number(parcel.beds) : null,
    bathrooms: parcel?.baths != null && Number.isFinite(Number(parcel.baths)) ? Number(parcel.baths) : null,
    squareFeet: parcel?.squareFeet != null && Number.isFinite(Number(parcel.squareFeet)) ? Number(parcel.squareFeet) : null,
    price: parcel?.estimate != null && Number.isFinite(Number(parcel.estimate)) ? Number(parcel.estimate) : null,
    funkEstimate: parcel?.estimate != null && Number.isFinite(Number(parcel.estimate)) ? Number(parcel.estimate) : null,
    photos: [],
    features: [],
    status: 'not_listed',
    availableForSale: false,
    acceptingOffers: false,
    acceptingCommunications: true,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(collection(db, PROPERTIES_COLLECTION), data);
  cacheRemove('properties_all');
  return docRef.id;
};

/** Max properties read per getAllProperties / searchProperties (Firestore efficiency). Emergency cap: was 300; lowered to 75 to stop high read volume. Wave 5 (Meilisearch) will replace for map/search. */
const PROPERTIES_QUERY_CAP = 75;

/**
 * Get active properties, newest first. Capped at PROPERTIES_QUERY_CAP to limit Firestore reads.
 * Archived are filtered out client-side. Results cached 3 min (Tier 2).
 */
export const getAllProperties = async () => {
  const cacheKey = 'properties_all';
  const cached = cacheGet(cacheKey, PROPERTIES_CACHE_TTL_MS);
  if (cached != null) return cached;
  if (FIRESTORE_READ_KILL_SWITCH) return [];
  try {
    const q = query(
      collection(db, PROPERTIES_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(PROPERTIES_QUERY_CAP)
    );
    const querySnapshot = await getDocs(q);
    const n = querySnapshot.size;
    metrics.recordFirestoreRead(n);
    metrics.recordReadByFeature('propertiesBrowse', n);

    const properties = [];
    querySnapshot.forEach((docSnap) => {
      properties.push({ id: docSnap.id, ...docSnap.data() });
    });

    const visibleProperties = properties.filter((p) => p.archived !== true);
    cacheSet(cacheKey, visibleProperties, PROPERTIES_CACHE_TTL_MS);
    return visibleProperties;
  } catch (error) {
    console.error('Error fetching properties:', error);
    throw error;
  }
};

/** Max properties read per getPropertiesBySeller (Firestore cost control). */
const PROPERTIES_BY_SELLER_CAP = 100;

/**
 * Get all properties by a specific seller (includes archived; caller may split). Capped to limit read volume.
 */
export const getPropertiesBySeller = async (sellerId) => {
  try {
    const q = query(
      collection(db, PROPERTIES_COLLECTION),
      where('sellerId', '==', sellerId),
      limit(PROPERTIES_BY_SELLER_CAP)
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
 * Get a single property by ID.
 * If status is under_contract, reconciles with offers (only PSA should be under_contract); may update and re-fetch.
 */
export const getPropertyById = async (propertyId) => {
  try {
    const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
    const docSnap = await getDoc(docRef);
    metrics.recordFirestoreRead(1);
    metrics.recordReadByFeature('propertyDetail', 1);
    if (!docSnap.exists()) throw new Error('Property not found');
    const data = docSnap.data();
    const property = { id: docSnap.id, ...data };
    if (property.status === 'under_contract') {
      try {
        const offers = await getOffersByProperty(propertyId);
        const updated = await reconcileUnderContractStatus(propertyId, offers);
        if (updated) {
          const refetch = await getDoc(docRef);
          if (refetch.exists()) return { id: refetch.id, ...refetch.data() };
        }
      } catch (_) {}
    }
    return property;
  } catch (error) {
    console.error('Error fetching property:', error);
    throw error;
  }
};

function searchCacheKey(filters) {
  const keys = Object.keys(filters || {}).sort();
  const o = keys.reduce((acc, k) => ({ ...acc, [k]: filters[k] }), {});
  return `properties_search_${JSON.stringify(o)}`;
}

/**
 * Search properties with filters. Fetches up to PROPERTIES_QUERY_CAP (newest first),
 * then filters client-side. Capped to limit Firestore reads. Results cached 3 min (Tier 2).
 */
export const searchProperties = async (filters = {}) => {
  const cacheKey = searchCacheKey(filters);
  const cached = cacheGet(cacheKey, PROPERTIES_CACHE_TTL_MS);
  if (cached != null) return cached;
  if (FIRESTORE_READ_KILL_SWITCH) return [];
  try {
    const q = query(
      collection(db, PROPERTIES_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(PROPERTIES_QUERY_CAP)
    );
    const querySnapshot = await getDocs(q);

    let properties = [];
    querySnapshot.forEach((docSnap) => {
      properties.push({ id: docSnap.id, ...docSnap.data() });
    });

    properties = properties.filter((p) => p.archived !== true);
    
    // Filter by listed status
    if (filters.listedStatus === 'listed') {
      // Show only listed properties (availableForSale is true and status is active/under_contract)
      properties = properties.filter((p) => 
        p.availableForSale !== false && 
        (p.status === 'active' || p.status === 'under_contract')
      );
    } else if (filters.listedStatus === 'not_listed') {
      // Show only off-market properties
      properties = properties.filter((p) => 
        p.availableForSale === false || 
        p.status === 'not_listed' ||
        (p.status !== 'active' && p.status !== 'under_contract')
      );
    }
    // If listedStatus is 'all' or not set, show all properties

    // Filter by property tier(s) (client-side via getListingTier)
    const tierList = Array.isArray(filters.propertyTiers) && filters.propertyTiers.length > 0
      ? filters.propertyTiers
      : filters.propertyTier && filters.propertyTier !== 'all'
        ? [filters.propertyTier]
        : null;
    if (tierList && tierList.length > 0) {
      properties = properties.filter((p) => tierList.includes(getListingTier(p)));
    }

    // Filter by communication status
    if (filters.communicationStatus === 'accepting') {
      properties = properties.filter((p) => p.acceptingCommunications !== false);
    } else if (filters.communicationStatus === 'not_accepting') {
      properties = properties.filter((p) => p.acceptingCommunications === false);
    }
    
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
    const typeList = Array.isArray(filters.propertyTypes) && filters.propertyTypes.length > 0
      ? filters.propertyTypes
      : filters.propertyType ? [filters.propertyType] : null;
    if (typeList && typeList.length > 0) {
      properties = properties.filter((p) => typeList.includes(p.propertyType));
    }
    if (filters.minSquareFeet && Number.isFinite(parseFloat(filters.minSquareFeet))) {
      const min = parseFloat(filters.minSquareFeet);
      properties = properties.filter((p) => (p.squareFeet ?? 0) >= min);
    }
    if (filters.maxSquareFeet && Number.isFinite(parseFloat(filters.maxSquareFeet))) {
      const max = parseFloat(filters.maxSquareFeet);
      properties = properties.filter((p) => (p.squareFeet ?? 0) <= max);
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

    cacheSet(cacheKey, properties, PROPERTIES_CACHE_TTL_MS);
    return properties;
  } catch (error) {
    console.error('Error searching properties:', error);
    throw error;
  }
};

/**
 * Reconcile under_contract status: property should only be under_contract if it has an accepted PSA.
 * If status is under_contract but offers have no accepted PSA (only LOI or none), set status to active.
 * @param {string} propertyId
 * @param {Array<{ status: string, offerType?: string }>} offers - offers for this property
 * @returns {Promise<boolean>} true if property was updated to active
 */
export const reconcileUnderContractStatus = async (propertyId, offers = []) => {
  const hasAcceptedPsa = offers.some(
    (o) => o.status === 'accepted' && o.offerType !== 'loi'
  );
  if (!hasAcceptedPsa) {
    await updateProperty(propertyId, { status: 'active' });
    return true;
  }
  return false;
};

/**
 * Update a property
 */
export const updateProperty = async (propertyId, updates) => {
  try {
    const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
    const clean = { ...updates, updatedAt: new Date() };
    Object.keys(clean).forEach((key) => {
      if (clean[key] === undefined) delete clean[key];
    });
    await updateDoc(docRef, clean);
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
