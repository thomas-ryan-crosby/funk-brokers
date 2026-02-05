// Property Service - Postgres API only (Firestore removed)
import { getOffersByProperty } from './offerService';
import { getListingTier } from '../utils/verificationScores';
import {
  getAllPropertiesApi,
  getPropertiesBySellerApi,
  getPropertyByIdApi,
  searchPropertiesApi,
  createPropertyApi,
  claimPropertyApi,
  updatePropertyApi,
  deletePropertyApi,
  deletePropertyPermanentlyApi,
} from './propertyApiService';

const PROPERTIES_QUERY_CAP = 75;
const PROPERTIES_BY_SELLER_CAP = 100;

export const createProperty = async (propertyData) => {
  return createPropertyApi(propertyData);
};

export const claimProperty = async (parcel, sellerId) => {
  if (!sellerId) throw new Error('User ID required to claim property');
  return claimPropertyApi(parcel, sellerId);
};

export const getAllProperties = async () => {
  return getAllPropertiesApi(PROPERTIES_QUERY_CAP);
};

export const getPropertiesBySeller = async (sellerId) => {
  return getPropertiesBySellerApi(sellerId, PROPERTIES_BY_SELLER_CAP);
};

export const getPropertyById = async (propertyId) => {
  const property = await getPropertyByIdApi(propertyId);
  if (!property) throw new Error('Property not found');
  if (property.status === 'under_contract') {
    try {
      const offers = await getOffersByProperty(propertyId);
      const updated = await reconcileUnderContractStatus(propertyId, offers);
      if (updated) return getPropertyByIdApi(propertyId);
    } catch (_) {}
  }
  return property;
};

export const searchProperties = async (filters = {}) => {
  return searchPropertiesApi({ ...filters, limit: filters.limit || PROPERTIES_QUERY_CAP });
};

export const reconcileUnderContractStatus = async (propertyId, offers = []) => {
  const hasAcceptedPsa = offers.some(
    (o) => o.status === 'accepted' && o.offerType !== 'loi'
  );
  if (!hasAcceptedPsa) {
    await updatePropertyApi(propertyId, { status: 'active' });
    return true;
  }
  return false;
};

export const updateProperty = async (propertyId, updates) => {
  await updatePropertyApi(propertyId, updates);
};

export const deleteProperty = async (propertyId) => {
  await deletePropertyApi(propertyId);
};

export const archiveProperty = async (propertyId) => {
  await updatePropertyApi(propertyId, { archived: true });
};

export const restoreProperty = async (propertyId) => {
  await updatePropertyApi(propertyId, { archived: false });
};

export const deletePropertyPermanently = async (propertyId) => {
  await deletePropertyPermanentlyApi(propertyId);
};
