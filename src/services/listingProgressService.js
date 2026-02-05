// Listing Progress Service - Postgres API only (Firestore removed)
import {
  getListingProgressApi,
  saveListingProgressApi,
  deleteListingProgressApi,
} from './listingProgressApiService';

export const getListingProgress = async (propertyId) => {
  if (!propertyId) return null;
  try {
    const data = await getListingProgressApi(propertyId);
    if (!data) return null;
    return {
      id: data.propertyId,
      ...data,
      formData: data.formData ?? {},
      completedSteps: data.completedSteps ?? [],
    };
  } catch (err) {
    console.error('Error fetching listing progress:', err);
    throw err;
  }
};

export const saveListingProgress = async (propertyId, progressData) => {
  if (!propertyId) throw new Error('propertyId is required');
  try {
    const existing = await getListingProgressApi(propertyId).catch(() => null);
    const merged = {
      step: progressData.step ?? existing?.step,
      formData: { ...(existing?.formData || {}), ...(progressData.formData || {}) },
      completedSteps: progressData.completedSteps ?? existing?.completedSteps ?? [],
    };
    await saveListingProgressApi(propertyId, merged);
  } catch (err) {
    console.error('Error saving listing progress:', err);
    throw err;
  }
};

export const deleteListingProgress = async (propertyId) => {
  if (!propertyId) return;
  try {
    await deleteListingProgressApi(propertyId);
  } catch (err) {
    console.error('Error clearing listing progress:', err);
  }
};

/**
 * Calculate listing readiness percentage
 */
export const calculateListingReadiness = (property) => {
  if (!property) return 0;

  let completedFields = 0;
  let totalFields = 0;

  const addressFields = ['address', 'city', 'state', 'zipCode'];
  totalFields += addressFields.length;
  addressFields.forEach((field) => {
    if (property[field] && String(property[field]).trim()) completedFields++;
  });

  const detailFields = ['propertyType', 'bedrooms', 'bathrooms'];
  totalFields += detailFields.length;
  detailFields.forEach((field) => {
    if (property[field] != null && property[field] !== '') completedFields++;
  });

  totalFields++;
  if (property.price != null && property.price > 0) completedFields++;

  totalFields += 0.5;
  if (property.photos && Array.isArray(property.photos) && property.photos.length > 0) {
    completedFields += 0.5;
  }

  totalFields += 0.5;
  if (property.description && String(property.description).trim().length > 50) {
    completedFields += 0.5;
  }

  return Math.min(100, Math.round((completedFields / totalFields) * 100));
};
