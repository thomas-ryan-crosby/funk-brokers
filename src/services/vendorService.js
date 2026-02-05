// Vendor service - Postgres API only (Firestore removed)
import {
  getVendorsByUserApi,
  getVendorByIdApi,
  createVendorApi,
  updateVendorApi,
  deleteVendorApi,
} from './vendorApiService';

export const VENDOR_TYPES = [
  { id: 'title_company', label: 'Title company' },
  { id: 'inspection_company', label: 'Inspection company' },
  { id: 'mortgage_services', label: 'Mortgage services' },
  { id: 'other', label: 'Other' },
];

export const createVendor = async (userId, data) => {
  if (!userId) throw new Error('userId is required');
  return createVendorApi(userId, {
    vendorName: data.vendorName || '',
    type: data.type || 'other',
    customType: data.type === 'other' ? (data.customType || null) : null,
    website: data.website || null,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    notes: data.notes || null,
    contacts: data.contacts || [],
  });
};

export const getVendorsByUser = async (userId) => {
  if (!userId) return [];
  const list = await getVendorsByUserApi(userId);
  return list.sort((a, b) => (a.vendorName || '').localeCompare(b.vendorName || ''));
};

export const getVendorById = async (vendorId) => {
  if (!vendorId) return null;
  return getVendorByIdApi(vendorId);
};

export const updateVendor = async (vendorId, data) => {
  if (!vendorId) throw new Error('vendorId is required');
  const payload = { updatedAt: new Date() };
  ['vendorName', 'type', 'customType', 'website', 'phone', 'email', 'address', 'notes', 'contacts'].forEach((k) => {
    if (data[k] !== undefined) payload[k] = data[k];
  });
  if (data.type !== 'other' && data.type !== undefined) payload.customType = null;
  await updateVendorApi(vendorId, payload);
};

export const addVendorContact = async (vendorId, contact) => {
  if (!vendorId) throw new Error('vendorId is required');
  const v = await getVendorByIdApi(vendorId);
  if (!v) throw new Error('Vendor not found');
  const contacts = [...(v.contacts || []), { ...contact, id: Date.now().toString() }];
  await updateVendorApi(vendorId, { contacts });
};

export const updateVendorContact = async (vendorId, contactId, contact) => {
  if (!vendorId) throw new Error('vendorId is required');
  const v = await getVendorByIdApi(vendorId);
  if (!v) throw new Error('Vendor not found');
  const contacts = (v.contacts || []).map((c) => (c.id === contactId ? { ...c, ...contact } : c));
  await updateVendorApi(vendorId, { contacts });
};

export const removeVendorContact = async (vendorId, contactId) => {
  if (!vendorId) throw new Error('vendorId is required');
  const v = await getVendorByIdApi(vendorId);
  if (!v) throw new Error('Vendor not found');
  const contacts = (v.contacts || []).filter((c) => c.id !== contactId);
  await updateVendorApi(vendorId, { contacts });
};

export const deleteVendor = async (vendorId) => {
  if (!vendorId) throw new Error('vendorId is required');
  await deleteVendorApi(vendorId);
};
