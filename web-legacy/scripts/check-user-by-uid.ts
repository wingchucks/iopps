/**
 * Check user and employer by UID
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

async function checkByUid(uid: string) {
    console.log(`\n🔍 Checking user by UID: ${uid}`);
    
    // Check user doc
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
        const userData = userDoc.data();
        console.log(`\n✅ User document found:`);
        console.log(`   Email: ${userData?.email}`);
        console.log(`   Role: ${userData?.role}`);
        console.log(`   Display Name: ${userData?.displayName}`);
        console.log(`   Employer ID: ${userData?.employerId || "NOT SET"}`);
    } else {
        console.log(`\n❌ No user document at uid: ${uid}`);
    }
    
    // Check employer doc directly by ID
    const empDoc = await db.collection("employers").doc(uid).get();
    if (empDoc.exists) {
        const empData = empDoc.data();
        console.log(`\n✅ Employer document found (by doc ID):`);
        console.log(JSON.stringify(empData, null, 2));
    } else {
        console.log(`\n❌ No employer document at id: ${uid}`);
        
        // Try query by userId
        const q = await db.collection("employers").where("userId", "==", uid).get();
        if (!q.empty) {
            console.log(`\n✅ Employer found via userId query:`);
            q.docs.forEach(doc => {
                console.log(`   Doc ID: ${doc.id}`);
                console.log(JSON.stringify(doc.data(), null, 2));
            });
        } else {
            console.log(`   Also no employer via userId query`);
        }
    }
}

const uid = process.argv[2];
if (!uid) {
    console.log("Usage: npx tsx scripts/check-user-by-uid.ts <UID>");
    process.exit(1);
}

checkByUid(uid).catch(console.error);
