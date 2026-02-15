/**
 * Reset password for a user by email
 * 
 * Usage:
 *   npx tsx scripts/reset-user-password.ts <email> <newPassword>
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

async function resetPassword() {
    const email = process.argv[2];
    const newPassword = process.argv[3];
    
    if (!email || !newPassword) {
        console.error("❌ Usage: npx tsx scripts/reset-user-password.ts <email> <newPassword>");
        process.exit(1);
    }
    
    if (newPassword.length < 6) {
        console.error("❌ Password must be at least 6 characters");
        process.exit(1);
    }
    
    try {
        // Get user by email
        const userRecord = await admin.auth().getUserByEmail(email);
        
        console.log(`\n✅ Found user: ${userRecord.uid}`);
        console.log(`   Email: ${userRecord.email}`);
        
        // Update password
        await admin.auth().updateUser(userRecord.uid, {
            password: newPassword
        });
        
        console.log(`\n🎉 Password updated successfully for ${email}`);
        console.log(`\n📌 New password: ${newPassword}`);
        
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            console.error(`❌ No user found with email: ${email}`);
        } else {
            console.error(`❌ Error: ${error.message}`);
        }
        process.exit(1);
    }
}

resetPassword().catch(console.error);
