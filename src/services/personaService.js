import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

export const createPersonaInquiry = async ({ name, dob, email, templateId }) => {
  const call = httpsCallable(functions, 'createPersonaInquiry');
  const response = await call({ name, dob, email, templateId });
  return response.data;
};
