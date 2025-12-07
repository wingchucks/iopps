/**
 * Shop Indigenous Storage Operations
 *
 * Handles image uploads and media management for vendors.
 */

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  type UploadTaskSnapshot,
} from "firebase/storage";
import { storage } from "@/lib/firebase";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ImageType = "profile" | "cover" | "gallery" | "verification" | "powwow" | "conference" | "event";

export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  state: "running" | "paused" | "success" | "canceled" | "error";
}

export interface UploadResult {
  url: string;
  path: string;
  filename: string;
}

export interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  size?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const IMAGE_PATHS: Record<ImageType, string> = {
  profile: "vendors/profile",
  cover: "vendors/cover",
  gallery: "vendors/gallery",
  verification: "vendors/verification",
  powwow: "powwows",
  conference: "conferences",
  event: "events/posters",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function checkStorage() {
  if (!storage) {
    throw new Error("Firebase Storage not initialized");
  }
  return storage;
}

/**
 * Generate a unique filename
 */
function generateFilename(vendorId: string, originalName: string): string {
  const extension = originalName.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${vendorId}_${timestamp}_${random}.${extension}`;
}

/**
 * Validate image file
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
    };
  }

  return { valid: true };
}

// ============================================================================
// UPLOAD OPERATIONS
// ============================================================================

/**
 * Upload an image with progress tracking
 */
export async function uploadImage(
  file: File,
  vendorId: string,
  imageType: ImageType,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Validate file
  const validation = validateImage(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const storageInstance = checkStorage();

  const filename = generateFilename(vendorId, file.name);
  // Build path based on image type - powwow, conference, and event have different structures
  let path: string;
  if (imageType === "powwow") {
    path = `${IMAGE_PATHS[imageType]}/${vendorId}/posters/${filename}`;
  } else if (imageType === "conference") {
    path = `${IMAGE_PATHS[imageType]}/${vendorId}/images/${filename}`;
  } else if (imageType === "event") {
    path = `${IMAGE_PATHS[imageType]}/${vendorId}/${filename}`;
  } else {
    path = `${IMAGE_PATHS[imageType]}/${vendorId}/${filename}`;
  }
  const storageRef = ref(storageInstance, path);

  // Create upload task
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      vendorId,
      imageType,
      originalName: file.name,
    },
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot: UploadTaskSnapshot) => {
        const progress: UploadProgress = {
          progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          state:
            snapshot.state === "running"
              ? "running"
              : snapshot.state === "paused"
              ? "paused"
              : snapshot.state === "success"
              ? "success"
              : snapshot.state === "canceled"
              ? "canceled"
              : "error",
        };
        onProgress?.(progress);
      },
      (error) => {
        reject(new Error(`Upload failed: ${error.message}`));
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url,
            path,
            filename,
          });
        } catch (error) {
          reject(new Error("Failed to get download URL"));
        }
      }
    );
  });
}

/**
 * Upload a profile image
 */
export async function uploadProfileImage(
  file: File,
  vendorId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const result = await uploadImage(file, vendorId, "profile", onProgress);
  return result.url;
}

/**
 * Upload a cover image
 */
export async function uploadCoverImage(
  file: File,
  vendorId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const result = await uploadImage(file, vendorId, "cover", onProgress);
  return result.url;
}

/**
 * Upload a gallery image
 */
export async function uploadGalleryImage(
  file: File,
  vendorId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return uploadImage(file, vendorId, "gallery", onProgress);
}

/**
 * Upload a verification document
 */
export async function uploadVerificationDocument(
  file: File,
  vendorId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return uploadImage(file, vendorId, "verification", onProgress);
}

/**
 * Upload an event poster image (for general events)
 */
export async function uploadEventImage(
  file: File,
  eventId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return uploadImage(file, eventId, "event", onProgress);
}

/**
 * Upload a pow wow poster image
 * Uses the powwow-specific path: powwows/{powwowId}/posters/{filename}
 */
export async function uploadPowwowImage(
  file: File,
  powwowId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return uploadImage(file, powwowId, "powwow", onProgress);
}

/**
 * Upload multiple gallery images
 */
export async function uploadGalleryImages(
  files: File[],
  vendorId: string,
  onProgress?: (index: number, progress: UploadProgress) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = await uploadGalleryImage(files[i], vendorId, (progress) => {
      onProgress?.(i, progress);
    });
    results.push(result);
  }

  return results;
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete an image by URL
 */
export async function deleteImageByUrl(url: string): Promise<boolean> {
  try {
    const storageInstance = checkStorage();

    // Extract path from URL
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+?)(\?|$)/);

    if (!pathMatch) {
      throw new Error("Invalid storage URL");
    }

    const path = decodeURIComponent(pathMatch[1]);
    const storageRef = ref(storageInstance, path);

    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error("Error deleting image:", error);
    return false;
  }
}

/**
 * Delete an image by path
 */
export async function deleteImageByPath(path: string): Promise<boolean> {
  try {
    const storageInstance = checkStorage();
    const storageRef = ref(storageInstance, path);

    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error("Error deleting image:", error);
    return false;
  }
}

/**
 * Delete all gallery images for a vendor
 */
export async function deleteVendorGallery(vendorId: string): Promise<number> {
  try {
    const storageInstance = checkStorage();
    const galleryRef = ref(storageInstance, `${IMAGE_PATHS.gallery}/${vendorId}`);

    const list = await listAll(galleryRef);
    let deletedCount = 0;

    for (const item of list.items) {
      try {
        await deleteObject(item);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting ${item.fullPath}:`, error);
      }
    }

    return deletedCount;
  } catch (error) {
    console.error("Error deleting vendor gallery:", error);
    return 0;
  }
}

// ============================================================================
// LIST OPERATIONS
// ============================================================================

/**
 * List all gallery images for a vendor
 */
export async function listVendorGalleryImages(
  vendorId: string
): Promise<{ url: string; path: string; name: string }[]> {
  try {
    const storageInstance = checkStorage();
    const galleryRef = ref(storageInstance, `${IMAGE_PATHS.gallery}/${vendorId}`);

    const list = await listAll(galleryRef);
    const images: { url: string; path: string; name: string }[] = [];

    for (const item of list.items) {
      try {
        const url = await getDownloadURL(item);
        images.push({
          url,
          path: item.fullPath,
          name: item.name,
        });
      } catch (error) {
        console.error(`Error getting URL for ${item.fullPath}:`, error);
      }
    }

    return images;
  } catch (error) {
    console.error("Error listing gallery images:", error);
    return [];
  }
}

// ============================================================================
// IMAGE PROCESSING HELPERS
// ============================================================================

/**
 * Create a thumbnail from an image file (client-side)
 */
export async function createThumbnail(
  file: File,
  maxWidth: number = 200,
  maxHeight: number = 200
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas not supported"));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create thumbnail"));
          }
        },
        "image/jpeg",
        0.8
      );
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get image dimensions from a file (client-side)
 */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
      });
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
      URL.revokeObjectURL(img.src);
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compress an image file (client-side)
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.85
): Promise<Blob> {
  const dimensions = await getImageDimensions(file);

  // Don't compress if already small enough
  if (dimensions.width <= maxWidth && dimensions.height <= maxHeight) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas not supported"));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions maintaining aspect ratio
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      if (ratio < 1) {
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to compress image"));
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}
