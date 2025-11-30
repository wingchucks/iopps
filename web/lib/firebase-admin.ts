import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Helper to parse the private key from various formats
function parsePrivateKey(key: string | undefined): string | null {
    if (!key) return null;

    let parsedKey = key.trim();

    // Remove surrounding quotes if present (single, double, or backticks)
    if ((parsedKey.startsWith('"') && parsedKey.endsWith('"')) ||
        (parsedKey.startsWith("'") && parsedKey.endsWith("'")) ||
        (parsedKey.startsWith('`') && parsedKey.endsWith('`'))) {
        parsedKey = parsedKey.slice(1, -1);
    }

    // Handle double-escaped newlines (\\\\n -> \\n -> \n)
    parsedKey = parsedKey.replace(/\\\\n/g, "\\n");

    // Replace literal \n with actual newlines
    parsedKey = parsedKey.replace(/\\n/g, "\n");

    // Handle Windows-style line endings
    parsedKey = parsedKey.replace(/\r\n/g, "\n");

    // Try to decode from base64 if it doesn't look like a PEM key
    if (!parsedKey.includes("-----BEGIN")) {
        try {
            const decoded = Buffer.from(parsedKey, "base64").toString("utf-8");
            if (decoded.includes("-----BEGIN")) {
                parsedKey = decoded;
            }
        } catch {
            // Not base64, continue with original
        }
    }

    // Final validation - must contain BEGIN PRIVATE KEY
    if (!parsedKey.includes("-----BEGIN PRIVATE KEY-----")) {
        console.error("Private key does not contain valid PEM header. First 50 chars:", parsedKey.substring(0, 50));
        return null;
    }

    return parsedKey;
}

// Try to parse service account from JSON string (alternative method)
function tryParseServiceAccountJson(): { projectId?: string; clientEmail?: string; privateKey?: string } | null {
    const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!jsonStr) return null;

    try {
        const parsed = JSON.parse(jsonStr);
        return {
            projectId: parsed.project_id,
            clientEmail: parsed.client_email,
            privateKey: parsed.private_key,
        };
    } catch {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON");
        return null;
    }
}

// Initialize Firebase Admin
if (!getApps().length) {
    try {
        // Connect to emulators if enabled
        if (process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
            process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
            process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
            process.env.FIREBASE_STORAGE_EMULATOR_HOST = "localhost:9199";
            console.log("🔧 Firebase Admin using Emulators");

            initializeApp({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-iopps",
            });
        } else {
            // Try JSON service account first (most reliable)
            const serviceAccount = tryParseServiceAccountJson();

            // Fall back to individual env vars
            const projectId = serviceAccount?.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
            const clientEmail = serviceAccount?.clientEmail || process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = serviceAccount?.privateKey || parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

            // Only attempt to initialize with cert if we have credentials
            if (projectId && clientEmail && privateKey) {
                initializeApp({
                    credential: cert({
                        projectId,
                        clientEmail,
                        privateKey,
                    }),
                });
                console.log("✅ Firebase Admin initialized successfully");
            } else {
                // Log which credentials are missing
                const missing = [];
                if (!projectId) missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
                if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
                if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");
                console.warn(`Firebase Admin credentials missing: ${missing.join(", ")}. API routes requiring auth will fail.`);
            }
        }
    } catch (error) {
        console.error("Firebase Admin initialization error:", error);
    }
}

// Export auth and db - they may be null if initialization failed
export const db = getApps().length ? getFirestore() : null;
export const auth = getApps().length ? getAuth() : null;
