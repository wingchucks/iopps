import type {
  FirebaseStorage,
  StorageReference,
  UploadTask,
  UploadTaskSnapshot,
} from "firebase/storage";

/**
 * Shared upload helpers for resume and avatar uploads.
 *
 * Pure validation + a dependency-injected uploader: pages pass the real
 * Firebase Storage SDK, tests pass mocks. No Firebase imports at runtime,
 * so this module is safe to import from node:test.
 */

/** 5MB — matches the size limits in storage.rules. */
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

export interface UploadCandidate {
  name: string;
  type: string;
  size: number;
}

const RESUME_MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/**
 * Derive the storage content type from the file extension. Some browsers
 * (notably on Android) report an empty or generic MIME type for .doc/.docx
 * files; storage.rules requires a matching contentType, so the uploader
 * sends this explicitly instead of relying on file.type alone.
 */
export function resumeContentType(fileName: string): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return RESUME_MIME_BY_EXT[ext] ?? null;
}

function isResumeType(file: UploadCandidate): boolean {
  return (
    Object.values(RESUME_MIME_BY_EXT).includes(file.type) ||
    resumeContentType(file.name) !== null
  );
}

/** Returns a user-facing error message, or null when the file is acceptable. */
export function validateResumeFile(file: UploadCandidate): string | null {
  if (!isResumeType(file)) {
    return "Please upload a PDF or Word document (.pdf, .doc, .docx).";
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return "Resume must be under 5MB.";
  }
  return null;
}

/** Returns a user-facing error message, or null when the file is acceptable. */
export function validateImageFile(file: UploadCandidate): string | null {
  if (!file.type.startsWith("image/")) {
    return "Please choose an image file (JPG or PNG).";
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return "Image must be under 5MB.";
  }
  return null;
}

export interface StorageDeps {
  ref: (storage: FirebaseStorage, path: string) => StorageReference;
  /**
   * Resumable upload. Optional so environments whose storage surface predates
   * it (e.g. mocked SDKs exposing only uploadBytes) still work: the uploader
   * falls back to a plain uploadBytes when this is absent.
   */
  uploadBytesResumable?: (
    storageRef: StorageReference,
    file: Blob,
    metadata?: { contentType?: string }
  ) => UploadTask;
  uploadBytes: (
    storageRef: StorageReference,
    file: Blob,
    metadata?: { contentType?: string }
  ) => Promise<unknown>;
  getDownloadURL: (storageRef: StorageReference) => Promise<string>;
}

/**
 * Upload a file to Firebase Storage with progress callbacks.
 * Resolves with the download URL; rejects when the upload or the
 * download-URL fetch fails so callers can show an error state.
 *
 * Prefers the resumable API (progress reporting) and falls back to plain
 * uploadBytes when the injected deps don't provide uploadBytesResumable.
 * The fallback still keeps the caller-visible contract: the promise stays
 * pending until the upload finishes, so pages can disable Next/continue
 * and explain the wait, then flip eligibility when the URL resolves.
 */
export function uploadToStorage(
  deps: StorageDeps,
  storage: FirebaseStorage,
  path: string,
  file: Blob,
  metadata: { contentType?: string } | undefined,
  onProgress: (percent: number) => void
): Promise<string> {
  const storageRef = deps.ref(storage, path);
  if (typeof deps.uploadBytesResumable === "function") {
    return new Promise<string>((resolve, reject) => {
      const task = (deps.uploadBytesResumable as NonNullable<StorageDeps["uploadBytesResumable"]>)(storageRef, file, metadata);
      task.on(
        "state_changed",
        (snapshot: UploadTaskSnapshot) => {
          const total = snapshot.totalBytes || 1;
          onProgress(
            Math.min(100, Math.round((snapshot.bytesTransferred / total) * 100))
          );
        },
        (err) => reject(err),
        () => {
          deps.getDownloadURL(task.snapshot.ref).then(resolve, reject);
        }
      );
    });
  }
  return deps.uploadBytes(storageRef, file, metadata).then(() => {
    onProgress(100);
    return deps.getDownloadURL(storageRef);
  });
}
