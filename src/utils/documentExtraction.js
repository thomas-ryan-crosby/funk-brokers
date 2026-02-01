import { firebaseConfig } from '../config/firebase-config';

const getFunctionsBaseUrl = () =>
  import.meta.env.VITE_FUNCTIONS_BASE_URL
  || `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net`;

export const extractDocumentData = async ({ url, docType }) => {
  const response = await fetch(`${getFunctionsBaseUrl()}/extractDocumentData`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, docType }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to extract document data.');
  }

  return response.json();
};
