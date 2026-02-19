import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

/**
 * Parse a private key string from various env-var formats.
 * Handles quoted values, escaped newlines, and base64-encoded keys.
 */
function parsePrivateKey(raw: string | undefined): string | null {
  if (!raw) return null;

  let key = raw.trim();

  // Strip surrounding quotes (single, double, or backtick)
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'")) ||
    (key.startsWith("`") && key.endsWith("`"))
  ) {
    key = key.slice(1, -1);
  }

  // Normalise escaped newlines
  key = key.replace(/\\\\n/g, "\\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n");

  // If it does not look like PEM, try base64 decode
  if (!key.includes("-----BEGIN")) {
    try {
      const decoded = Buffer.from(key, "base64").toString("utf-8");
      if (decoded.includes("-----BEGIN")) {
        key = decoded;
      }
    } catch {
      // Not base64 - continue with original
    }
  }

  if (!key.includes("-----BEGIN PRIVATE KEY-----")) {
    return null;
  }

  return key;
}

/**
 * Attempt to read a full service-account JSON from env (base64 or raw).
 */
function tryParseServiceAccountJson(): {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
} | null {
  // Prefer base64-encoded (most reliable for Vercel / CI)
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64) {
    try {
      const json = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
      return {
        projectId: json.project_id,
        clientEmail: json.client_email,
        privateKey: json.private_key,
      };
    } catch {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64");
    }
  }

  // Fallback: raw JSON string
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    try {
      const json = JSON.parse(raw);
      return {
        projectId: json.project_id,
        clientEmail: json.client_email,
        privateKey: json.private_key,
      };
    } catch {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON");
    }
  }

  return null;
}

/**
 * Initialise the Firebase Admin SDK.
 *
 * Credential resolution order:
 * 1. FIREBASE_SERVICE_ACCOUNT_BASE64 / FIREBASE_SERVICE_ACCOUNT_JSON
 * 2. Individual FIREBASE_* env vars (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY)
 * 3. applicationDefault() (GCP environments / GOOGLE_APPLICATION_CREDENTIALS)
 */
function initAdmin(): void {
  if (getApps().length) return; // already initialised

  // Emulator mode
  if (process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
    process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = "localhost:9199";

    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-iopps",
    });
    return;
  }

  // Try JSON-based service account first
  const sa = tryParseServiceAccountJson();

  const projectId =
    sa?.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = sa?.clientEmail || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey =
    sa?.privateKey || parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (projectId && clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return;
  }

  // Last resort: application default credentials (GCP / local gcloud auth)
  try {
    initializeApp({ credential: applicationDefault() });
  } catch (err) {
    console.error("Firebase Admin could not initialise:", err);
  }
}

// Initialise on module load
initAdmin();

// Exports - safe to call even if init failed (getApps().length === 0 guard)
export const adminAuth = getApps().length ? getAuth() : null;
export const adminDb = getApps().length ? getFirestore() : null;
export const adminStorage = getApps().length ? getStorage() : null;
