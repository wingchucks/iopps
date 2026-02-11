/**
 * Create or update an admin user with both Auth and Firestore records
 * 
 * Usage:
 *   npx tsx scripts/create-admin-user.ts <email> <password> [displayName]
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

const db = admin.firestore();

async function createAdminUser() {
    const email = process.argv[2];
    const password = process.argv[3];
    const displayName = process.argv[4] || "Test Admin";
    
    if (!email || !password) {
        console.error("❌ Usage: npx tsx scripts/create-admin-user.ts <email> <password> [displayName]");
        process.exit(1);
    }
    
    if (password.length < 6) {
        console.error("❌ Password must be at least 6 characters");
        process.exit(1);
    }
    
    let uid: string;
    let isNew = false;
    
    try {
        // Check if auth user exists
        const existingUser = await admin.auth().getUserByEmail(email);
        uid = existingUser.uid;
        console.log(`\n✅ Found existing auth user: ${uid}`);
        
        // Update password
        await admin.auth().updateUser(uid, { password, displayName });
        console.log(`   Updated password and display name`);
        
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            // Create new auth user
            console.log(`\n📝 Creating new auth user...`);
            const newUser = await admin.auth().createUser({
                email,
                password,
                displayName,
                emailVerified: true
            });
            uid = newUser.uid;
            isNew = true;
            console.log(`✅ Created auth user: ${uid}`);
        } else {
            throw error;
        }
    }
    
    // Update or create Firestore user document
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
        await userRef.update({
            role: "admin",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Updated Firestore user role to 'admin'`);
    } else {
        await userRef.set({
            email: email.toLowerCase(),
            displayName,
            role: "admin",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Created Firestore user document with 'admin' role`);
    }
    
    // Clean up old Firestore doc if it exists with different UID
    const oldDocs = await db.collection("users")
        .where("email", "==", email.toLowerCase())
        .get();
    
    for (const doc of oldDocs.docs) {
        if (doc.id !== uid) {
            console.log(`🧹 Removing orphaned Firestore doc: ${doc.id}`);
            await doc.ref.delete();
        }
    }
    
    console.log(`\n🎉 Admin user ready!`);
    console.log(`\n   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: admin`);
    console.log(`   UID: ${uid}`);
    console.log(`\n📌 Login at: https://www.iopps.ca/login`);
    console.log(`   Admin panel: https://www.iopps.ca/admin`);
}

createAdminUser().catch(console.error);
