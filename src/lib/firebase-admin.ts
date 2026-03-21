import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let _app: App | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

interface AdminCredentialShape {
  projectId?: string;
  project_id?: string;
  clientEmail?: string;
  client_email?: string;
  privateKey?: string;
  private_key?: string;
}

function stripWrappingQuotes(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
  return value;
}

function normalizePrivateKey(value: string): string {
  return stripWrappingQuotes(value).replace(/\\n/g, "\n");
}

function parseBase64Credential(): { projectId: string; clientEmail: string; privateKey: string } | null {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!encoded) return null;

  try {
    const decoded = Buffer.from(stripWrappingQuotes(encoded), "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as AdminCredentialShape;
    const projectId = parsed.projectId || parsed.project_id || "";
    const clientEmail = parsed.clientEmail || parsed.client_email || "";
    const privateKey = normalizePrivateKey(parsed.privateKey || parsed.private_key || "");

    if (!projectId || !clientEmail || !privateKey) {
      return null;
    }

    return { projectId, clientEmail, privateKey };
  } catch (error) {
    console.error("[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:", error);
    return null;
  }
}

function shouldUseEmulators(): boolean {
  const explicitFlag = process.env.NEXT_PUBLIC_USE_EMULATORS ?? process.env.USE_EMULATOR;
  if (explicitFlag !== undefined) {
    return explicitFlag === "true";
  }

  return (
    Boolean(
      process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST ||
      process.env.FIREBASE_STORAGE_EMULATOR_HOST
    )
  );
}

export function hasAdminRuntimeSupport(): boolean {
  if (shouldUseEmulators()) return true;

  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
    (
      (process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    )
  );
}

function configureEmulatorEnv(): string {
  const projectId =
    process.env.GCLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    "demo-iopps";

  process.env.GCLOUD_PROJECT = projectId;
  process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ||= "127.0.0.1:9199";

  return projectId;
}

export function getAdminApp(): App {
  if (_app) return _app;

  const existing = getApps();
  if (existing.length > 0) {
    _app = existing[0];
    return _app;
  }

  if (shouldUseEmulators()) {
    _app = initializeApp({
      projectId: configureEmulatorEnv(),
    });
    return _app;
  }

  const base64Credential = parseBase64Credential();
  const projectId =
    base64Credential?.projectId ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail =
    base64Credential?.clientEmail ||
    process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey =
    base64Credential?.privateKey ||
    (process.env.FIREBASE_PRIVATE_KEY ? normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY) : undefined);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)");
  }

  _app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return _app;
}

export function getAdminAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getAdminApp());
  return _auth;
}

export function getAdminDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getAdminApp());
  return _db;
}

// Also export these for compatibility with admin API routes:
export const adminAuth = (() => { try { return getAdminAuth(); } catch { return null; } })();
export const adminDb = (() => { try { return getAdminDb(); } catch { return null; } })();
