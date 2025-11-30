import { NextResponse } from "next/server";

export async function GET() {
    // List all env vars that contain "FIREBASE" in the name
    const allFirebaseVars: Record<string, string> = {};
    for (const key of Object.keys(process.env)) {
        if (key.includes("FIREBASE") || key.includes("firebase")) {
            allFirebaseVars[key] = process.env[key]?.substring(0, 50) + "..." || "empty";
        }
    }

    const hasServiceAccountJson = !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const hasServiceAccountBase64 = !!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    const hasProjectId = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
    const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;

    let jsonParseError = null;
    let jsonKeys = null;
    let base64ParseError = null;
    let base64Keys = null;

    // Try to parse base64 version
    if (hasServiceAccountBase64) {
        try {
            const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64!, "base64").toString("utf-8");
            const parsed = JSON.parse(decoded);
            base64Keys = Object.keys(parsed);
        } catch (e: any) {
            base64ParseError = e.message;
        }
    }

    if (hasServiceAccountJson) {
        try {
            const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
            jsonKeys = Object.keys(parsed);
        } catch (e: any) {
            jsonParseError = e.message;
        }
    }

    // Check private key format
    let privateKeyInfo = null;
    if (hasPrivateKey) {
        const pk = process.env.FIREBASE_PRIVATE_KEY!;
        privateKeyInfo = {
            length: pk.length,
            first30: pk.substring(0, 30),
            containsBegin: pk.includes("-----BEGIN"),
            containsLiteralNewline: pk.includes("\\n"),
            containsActualNewline: pk.includes("\n"),
        };
    }

    // Check if Firebase Admin initialized
    const { getApps } = require("firebase-admin/app");
    const appsCount = getApps().length;

    return NextResponse.json({
        allFirebaseVars,
        envVars: {
            FIREBASE_SERVICE_ACCOUNT_BASE64: hasServiceAccountBase64 ? "SET" : "MISSING",
            FIREBASE_SERVICE_ACCOUNT_JSON: hasServiceAccountJson ? "SET" : "MISSING",
            NEXT_PUBLIC_FIREBASE_PROJECT_ID: hasProjectId ? "SET" : "MISSING",
            FIREBASE_CLIENT_EMAIL: hasClientEmail ? "SET" : "MISSING",
            FIREBASE_PRIVATE_KEY: hasPrivateKey ? "SET" : "MISSING",
        },
        privateKeyInfo,
        base64Parse: base64ParseError ? `ERROR: ${base64ParseError}` : (hasServiceAccountBase64 ? "OK" : "N/A"),
        base64Keys,
        jsonParse: jsonParseError ? `ERROR: ${jsonParseError}` : (hasServiceAccountJson ? "OK" : "N/A"),
        jsonKeys,
        firebaseAppsInitialized: appsCount,
        recommendation: hasServiceAccountBase64 && base64Keys ? "Using BASE64 (recommended)" :
                       hasServiceAccountJson && jsonKeys ? "Using JSON" :
                       (hasPrivateKey && hasClientEmail && hasProjectId) ? "Using individual env vars" :
                       "CREDENTIALS INCOMPLETE - Add FIREBASE_SERVICE_ACCOUNT_BASE64",
    });
}
