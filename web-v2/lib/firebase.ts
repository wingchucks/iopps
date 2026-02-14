import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate that required config is present
const hasConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
);

if (
  !hasConfig &&
  typeof window !== "undefined" &&
  process.env.NODE_ENV === "development"
) {
  console.warn("Firebase config incomplete - check environment variables");
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (hasConfig) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  // Connect to emulators when NEXT_PUBLIC_USE_EMULATORS=true (client-side only)
  if (
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_USE_EMULATORS === "true"
  ) {
    // Track connection state to avoid double-connecting on HMR
    const w = window as unknown as { __FIREBASE_EMULATORS_CONNECTED__?: boolean };

    if (!w.__FIREBASE_EMULATORS_CONNECTED__) {
      try {
        connectAuthEmulator(auth, "http://localhost:9099", {
          disableWarnings: true,
        });
        connectFirestoreEmulator(db, "localhost", 8080);
        connectStorageEmulator(storage, "localhost", 9199);
        w.__FIREBASE_EMULATORS_CONNECTED__ = true;
      } catch {
        // Emulators not available - continue with production Firebase
      }
    }
  }
}

// Google auth provider configured to always prompt account selection
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export { auth, db, storage };
export default app;
