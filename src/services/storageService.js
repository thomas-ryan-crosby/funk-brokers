// Storage Service - Firebase Storage operations for file uploads
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';
import metrics from '../utils/metrics';

/**
 * Upload a file to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} path - The storage path (e.g., 'properties/123/photos/image1.jpg')
 * @returns {Promise<string>} - The download URL
 */
export const uploadFile = async (file, path) => {
  try {
    const bytes = file?.size ?? 0;
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    metrics.recordStorageUpload(bytes);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Upload multiple files
 * @param {File[]} files - Array of files to upload
 * @param {string} basePath - Base storage path
 * @returns {Promise<string[]>} - Array of download URLs
 */
export const uploadMultipleFiles = async (files, basePath) => {
  try {
    const uploadPromises = files.map((file, index) => {
      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}_${index}.${fileExtension}`;
      const filePath = `${basePath}/${fileName}`;
      return uploadFile(file, filePath);
    });
    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error) {
    console.error('Error uploading multiple files:', error);
    throw error;
  }
};

/**
 * Upload multiple files with aggregate progress callback.
 * @param {File[]} files
 * @param {string} basePath
 * @param {(percent: number) => void} [onProgress]
 * @returns {Promise<string[]>}
 */
export const uploadMultipleFilesWithProgress = async (files, basePath, onProgress) => {
  try {
    const totalBytes = files.reduce((sum, f) => sum + (f?.size || 0), 0);
    const progressMap = new Map();
    const updateProgress = () => {
      if (!onProgress || totalBytes === 0) return;
      const uploaded = Array.from(progressMap.values()).reduce((sum, v) => sum + v, 0);
      const percent = Math.round((uploaded / totalBytes) * 100);
      onProgress(percent);
    };

    const uploadPromises = files.map((file, index) => {
      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}_${index}.${fileExtension}`;
      const filePath = `${basePath}/${fileName}`;
      const storageRef = ref(storage, filePath);
      const task = uploadBytesResumable(storageRef, file);
      return new Promise((resolve, reject) => {
        task.on(
          'state_changed',
          (snapshot) => {
            progressMap.set(fileName, snapshot.bytesTransferred || 0);
            updateProgress();
          },
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            metrics.recordStorageUpload(file?.size ?? 0);
            resolve(url);
          }
        );
      });
    });

    const urls = await Promise.all(uploadPromises);
    if (onProgress) onProgress(100);
    return urls;
  } catch (error) {
    console.error('Error uploading multiple files with progress:', error);
    throw error;
  }
};

/**
 * Delete a file from Firebase Storage
 * @param {string} path - The storage path to delete
 */
export const deleteFile = async (path) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};
