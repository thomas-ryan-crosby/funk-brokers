import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

export const extractDocumentData = async ({ url, path, docType }) => {
  const callable = httpsCallable(functions, 'extractDocumentData');
  const result = await callable({ url, path, docType });
  return result?.data || {};
};
