// Storage Service - Upload API (Vercel Blob); no Firebase
import metrics from '../utils/metrics';

function getUploadBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/upload`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.indexOf(',') >= 0 ? dataUrl.split(',')[1] : dataUrl;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a file via the upload API (Vercel Blob).
 * @param {File} file
 * @param {string} path - Storage path (e.g. 'properties/123/photos/1.jpg')
 * @returns {Promise<string>} - The public URL
 */
export const uploadFile = async (file, path) => {
  const bytes = file?.size ?? 0;
  const base64 = await fileToBase64(file);
  const res = await fetch(getUploadBase(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path,
      content: base64,
      contentType: file?.type || undefined,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed: ${res.status}`);
  }
  const data = await res.json();
  metrics.recordStorageUpload(bytes);
  return data.url;
};

/**
 * Upload multiple files.
 */
export const uploadMultipleFiles = async (files, basePath) => {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split('.').pop();
    const filePath = `${basePath}/${Date.now()}_${i}.${ext}`;
    const url = await uploadFile(file, filePath);
    urls.push(url);
  }
  return urls;
};

/**
 * Upload multiple files with aggregate progress (approximate; we don't have per-request progress).
 */
export const uploadMultipleFilesWithProgress = async (files, basePath, onProgress) => {
  const total = files.length;
  let done = 0;
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split('.').pop();
    const filePath = `${basePath}/${Date.now()}_${i}.${ext}`;
    const url = await uploadFile(file, filePath);
    urls.push(url);
    done++;
    if (onProgress) onProgress(total ? Math.round((done / total) * 100) : 100);
  }
  if (onProgress) onProgress(100);
  return urls;
};

/**
 * Delete a file. (Upload API does not expose delete; you would need a separate delete endpoint and Blob del().)
 */
export const deleteFile = async (_path) => {
  console.warn('storageService.deleteFile: not implemented for upload API');
};
