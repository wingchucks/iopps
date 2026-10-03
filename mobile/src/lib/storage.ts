import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "./firebase";
import { storageLogger } from "./logger";

// Uploads use the website's locations, which storage.rules (repository root) allows:
// avatars/{uid}.{ext} for profile photos and resumes/{uid}/{file} for resumes, each
// under 5 MB with an image or PDF/Word content type. Job applications only accept a
// resume stored under resumes/{uid}/.
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const IMAGE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

const RESUME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

export interface UploadResult {
  downloadURL: string;
  path: string;
}

/** The lowercase extension of a file name or URI, ignoring any query or fragment. */
function extensionOf(nameOrUri: string): string {
  const name = nameOrUri.split(/[?#]/)[0].split("/").pop() || "";
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** Same rule as the website's createResumeObjectName (src/lib/application-snapshot.ts). */
function safeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "resume.pdf";
}

/**
 * Convert a local file URI to a Blob for upload
 */
async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
}

function upload(
  path: string,
  blob: Blob,
  contentType: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const storageRef = ref(storage, path);
  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, blob, { contentType });

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
 * Upload a profile photo to Firebase Storage
 */
export async function uploadProfilePhoto(
  userId: string,
  localUri: string,
  onProgress?: (progress: UploadProgress) => void,
  mimeType?: string | null
): Promise<UploadResult> {
  const blob = await uriToBlob(localUri);
  const extension = IMAGE_TYPES[extensionOf(localUri)] ? extensionOf(localUri) : "jpg";
  const contentType = mimeType?.startsWith("image/") ? mimeType : IMAGE_TYPES[extension];
  return upload(`avatars/${userId}.${extension}`, blob, contentType, onProgress);
}

/** The content type storage.rules accepts for a resume, or null for any other file. */
export function resumeContentType(fileName: string, mimeType?: string | null): string | null {
  if (mimeType && Object.values(RESUME_TYPES).includes(mimeType)) return mimeType;
  return RESUME_TYPES[extensionOf(fileName)] ?? null;
}

/**
 * Upload a resume to Firebase Storage
 */
export async function uploadResume(
  userId: string,
  localUri: string,
  fileName: string,
  onProgress?: (progress: UploadProgress) => void,
  mimeType?: string | null
): Promise<UploadResult> {
  const contentType = resumeContentType(fileName, mimeType);
  if (!contentType) throw new Error("Please choose a PDF or Word document.");
  const blob = await uriToBlob(localUri);
  const path = `resumes/${userId}/${Date.now()}_${safeFileName(fileName)}`;
  return upload(path, blob, contentType, onProgress);
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
