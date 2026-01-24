// Vendor Service - Firestore CRUD for user's vendors/contacts (title, inspection, mortgage, other)
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

const VENDORS_COLLECTION = 'vendors';

export const VENDOR_TYPES = [
  { id: 'title_company', label: 'Title company' },
  { id: 'inspection_company', label: 'Inspection company' },
  { id: 'mortgage_services', label: 'Mortgage services' },
  { id: 'other', label: 'Other' },
];

/**
 * Create a vendor for a user.
 * @param {string} userId
 * @param {object} data - { name, company?, phone?, email?, type }
 * @returns {Promise<string>} vendor id
 */
export const createVendor = async (userId, data) => {
  if (!userId) throw new Error('userId is required');
  const now = new Date();
  const ref = await addDoc(collection(db, VENDORS_COLLECTION), {
    userId,
    name: data.name || '',
    company: data.company || null,
    phone: data.phone || null,
    email: data.email || null,
    type: data.type || 'other',
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
};

/**
 * Get all vendors for a user.
 */
export const getVendorsByUser = async (userId) => {
  if (!userId) return [];
  const q = query(
    collection(db, VENDORS_COLLECTION),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
  list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return list;
};

/**
 * Get a single vendor by ID.
 */
export const getVendorById = async (vendorId) => {
  if (!vendorId) return null;
  const ref = doc(db, VENDORS_COLLECTION, vendorId);
  const d = await getDoc(ref);
  if (!d.exists()) return null;
  return { id: d.id, ...d.data() };
};

/**
 * Update a vendor.
 */
export const updateVendor = async (vendorId, data) => {
  if (!vendorId) throw new Error('vendorId is required');
  const ref = doc(db, VENDORS_COLLECTION, vendorId);
  const payload = { updatedAt: new Date() };
  ['name', 'company', 'phone', 'email', 'type'].forEach((k) => {
    if (data[k] !== undefined) payload[k] = data[k];
  });
  await updateDoc(ref, payload);
};

/**
 * Delete a vendor.
 */
export const deleteVendor = async (vendorId) => {
  if (!vendorId) throw new Error('vendorId is required');
  await deleteDoc(doc(db, VENDORS_COLLECTION, vendorId));
};
