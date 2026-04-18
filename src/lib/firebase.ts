import { initializeApp, getApps } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { getToken, initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from "firebase/app-check";

// Placeholders keep `initializeApp` from throwing during builds that don't
// inject NEXT_PUBLIC_FIREBASE_* (e.g. GitHub Actions CI). Vercel + local .env
// always supply real values, so production/runtime behavior is unaffected.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "ci-placeholder-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "ci-placeholder.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ci-placeholder",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "ci-placeholder.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "0",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:0:web:ci",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
let appCheckInstance: AppCheck | null = null;
const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

// Initialize Firebase App Check with reCAPTCHA Enterprise (client-side only)
if (typeof window !== "undefined") {
  const isLocalHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (!isLocalHost) {
    try {
      appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider("6LeFMHosAAAAAFKTIgee7jESAYTypsH69SbjnbSF"),
        isTokenAutoRefreshEnabled: true,
      });
    } catch {
      // App Check already initialized (e.g., HMR in development)
    }
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

if (typeof window !== "undefined" && useEmulators) {
  const emulatorHost =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "127.0.0.1"
      : window.location.hostname;

  try {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  } catch {
    // Auth emulator may already be connected during HMR.
  }

  try {
    connectFirestoreEmulator(db, emulatorHost, 8080);
  } catch {
    // Firestore emulator may already be connected during HMR.
  }

  try {
    connectStorageEmulator(storage, emulatorHost, 9199);
  } catch {
    // Storage emulator may already be connected during HMR.
  }
}

export async function getAppCheckTokenValue(forceRefresh = false): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const isLocalHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (isLocalHost || !appCheckInstance) return null;

  try {
    const result = await getToken(appCheckInstance, forceRefresh);
    return result.token || null;
  } catch {
    return null;
  }
}

export default app;
