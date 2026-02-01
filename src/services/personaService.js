import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

export const createPersonaInquiry = async ({ name, dob, email }) => {
  const call = httpsCallable(functions, 'createPersonaInquiry');
  const response = await call({ name, dob, email });
  return response.data;
};
