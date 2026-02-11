/**
 * Set Firebase Auth custom claims for admin users
 * 
 * Usage:
 *   npx tsx scripts/set-admin-claims.ts <email> [admin|moderator]
 * 
 * This sets the custom claim on the Firebase Auth user, which is checked
 * by security rules and server-side code.
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import * as admin from "firebase-admin";

const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64!, "base64").toString("utf-8")
);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

async function setAdminClaims() {
    const email = process.argv[2];
    const role = process.argv[3] || "admin";
    
    if (!email) {
        console.error("❌ Usage: npx tsx scripts/set-admin-claims.ts <email> [admin|moderator]");
        process.exit(1);
    }
    
    if (role !== "admin" && role !== "moderator") {
        console.error("❌ Role must be 'admin' or 'moderator'");
        process.exit(1);
    }
    
    try {
        // Get user by email
        const userRecord = await admin.auth().getUserByEmail(email);
        
        console.log(`\n✅ Found user: ${userRecord.uid}`);
        console.log(`   Email: ${userRecord.email}`);
        console.log(`   Current claims: ${JSON.stringify(userRecord.customClaims || {})}`);
        
        // Set custom claims
        const claims = {
            admin: role === "admin",
            moderator: role === "admin" || role === "moderator",
            role: role
        };
        
        await admin.auth().setCustomUserClaims(userRecord.uid, claims);
        
        console.log(`\n🎉 Custom claims set successfully!`);
        console.log(`   New claims: ${JSON.stringify(claims)}`);
        console.log(`\n📌 User must sign out and back in for claims to take effect.`);
        
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            console.error(`❌ No user found with email: ${email}`);
        } else {
            console.error(`❌ Error: ${error.message}`);
        }
        process.exit(1);
    }
}

setAdminClaims().catch(console.error);
