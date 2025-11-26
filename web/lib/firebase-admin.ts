import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin
if (!getApps().length) {
    try {
        // Check if we have the necessary credentials
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;

        // Only attempt to initialize with cert if we have credentials
        if (projectId && clientEmail && privateKey) {
            initializeApp({
                credential: cert({
                    projectId,
                    clientEmail,
                    privateKey: privateKey.replace(/\\n/g, "\n"),
                }),
            });
        } else {
            // If missing credentials (e.g. during build), initialize with default (will fail at runtime if used)
            // or just don't initialize if we want to be safer
            console.warn("Firebase Admin credentials missing. Skipping initialization.");
            if (process.env.NODE_ENV === "development") {
                initializeApp();
            }
        }
    } catch (error) {
        console.error("Firebase Admin initialization error:", error);
    }
}

// Export a function to get DB to ensure it's initialized or throw error at runtime
// Export a function to get DB to ensure it's initialized or throw error at runtime
export const db = getApps().length ? getFirestore() : null as any;
export const auth = getApps().length ? getAuth() : null as any;
