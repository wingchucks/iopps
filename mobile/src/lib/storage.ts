import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "./firebase";
import { storageLogger } from "./logger";

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

export interface UploadResult {
  downloadURL: string;
  path: string;
}

/**
 * Convert a local file URI to a Blob for upload
 */
async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
}

/**
 * Upload a profile photo to Firebase Storage
 */
export async function uploadProfilePhoto(
  userId: string,
  localUri: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const blob = await uriToBlob(localUri);
  const extension = localUri.split(".").pop() || "jpg";
  const path = `users/${userId}/profile.${extension}`;
  const storageRef = ref(storage, path);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, blob);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.({
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          progress,
        });
      },
      (error) => {
        storageLogger.error("Upload error:", error);
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ downloadURL, path });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Upload a resume to Firebase Storage
 */
export async function uploadResume(
  userId: string,
  localUri: string,
  fileName: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const blob = await uriToBlob(localUri);
  // Sanitize filename
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = `users/${userId}/resumes/${Date.now()}_${sanitizedName}`;
  const storageRef = ref(storage, path);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, blob);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.({
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          progress,
        });
      },
      (error) => {
        storageLogger.error("Upload error:", error);
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ downloadURL, path });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Delete a file from Firebase Storage
 */
export async function deleteFile(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

/**
 * Get a download URL for a file
 */
export async function getFileURL(path: string): Promise<string> {
  const storageRef = ref(storage, path);
  return await getDownloadURL(storageRef);
}
