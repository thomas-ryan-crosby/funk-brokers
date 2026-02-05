// Storage Service - Upload API (Vercel Blob); no Firebase
import { upload } from '@vercel/blob/client';
import metrics from '../utils/metrics';

function getUploadBase() {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.VITE_API_BASE || window.location.origin).replace(/\/$/, '');
  return `${base}/api/upload`;
}

/**
 * Upload a file via the upload API (Vercel Blob).
 * @param {File} file
 * @param {string} path - Storage path (e.g. 'properties/123/photos/1.jpg')
 * @returns {Promise<string>} - The public URL
 */
export const uploadFile = async (file, path) => {
  const bytes = file?.size ?? 0;
  const blob = await upload(path, file, {
    handleUploadUrl: getUploadBase(),
    contentType: file?.type || undefined,
  });
  metrics.recordStorageUpload(bytes);
  return blob.url;
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
