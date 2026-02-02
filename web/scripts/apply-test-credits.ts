/**
 * Directly apply job credits for failed test webhook
 * This bypasses Stripe and just updates Firestore
 */

import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import admin from "firebase-admin";

// Initialize Firebase Admin
const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
if (!base64) {
    console.error("FIREBASE_SERVICE_ACCOUNT_BASE64 not found in environment");
    process.exit(1);
}

const serviceAccount = JSON.parse(
    Buffer.from(base64, "base64").toString("utf-8")
);

if (admin.apps?.length === 0 || !admin.apps?.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

async function applyTestCredits() {
    const testEmail = "nathan.arias@iopps.ca";
    
    console.log(`Looking for employer with email: ${testEmail}`);
    
    // Find employer by email
    const usersSnapshot = await db.collection("users")
        .where("email", "==", testEmail)
        .limit(1)
        .get();
    
    if (usersSnapshot.empty) {
        console.log("No user found with that email. Checking employers collection...");
        
        // Try employers collection
        const employersSnapshot = await db.collection("employers")
            .where("email", "==", testEmail)
            .limit(1)
            .get();
        
        if (employersSnapshot.empty) {
            console.log("No employer found either. Let me list some employers:");
            const allEmployers = await db.collection("employers").limit(10).get();
            allEmployers.forEach(doc => {
                const data = doc.data();
                console.log(`  - ${doc.id}: ${data.email || data.companyName || 'no email'}`);
            });
            return;
        }
        
        const employerDoc = employersSnapshot.docs[0];
        await applyCreditsToEmployer(employerDoc.id, employerDoc.data());
        return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    console.log(`Found user: ${userDoc.id}`);
    console.log(`  Email: ${userData.email}`);
    console.log(`  Role: ${userData.role}`);
    
    if (userData.employerId) {
        console.log(`  Employer ID: ${userData.employerId}`);
        const employerRef = db.collection("employers").doc(userData.employerId);
        const employerSnap = await employerRef.get();
        if (employerSnap.exists) {
            await applyCreditsToEmployer(userData.employerId, employerSnap.data()!);
        } else {
            console.log("Employer document not found!");
        }
    } else {
        // User might be the employer themselves
        await applyCreditsToEmployer(userDoc.id, userData);
    }
}

async function applyCreditsToEmployer(employerId: string, currentData: any) {
    console.log(`\nEmployer: ${employerId}`);
    console.log(`  Current jobCredits: ${currentData.jobCredits || 0}`);
    
    // This was a $1 test payment - just add 1 test credit
    const creditsToAdd = 1;
    const newCredits = (currentData.jobCredits || 0) + creditsToAdd;
    
    console.log(`  Adding ${creditsToAdd} credits (from 7 test payments of $125)`);
    console.log(`  New total: ${newCredits}`);
    
    // Update the employer
    await db.collection("employers").doc(employerId).update({
        jobCredits: newCredits,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Log the transaction
    await db.collection("employers").doc(employerId).collection("creditHistory").add({
        type: "purchase",
        credits: creditsToAdd,
        amount: 100, // $1 test payment in cents
        currency: "cad",
        description: "Manual credit application for failed test webhooks",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log(`\n✅ Successfully applied ${creditsToAdd} credits to employer ${employerId}`);
}

applyTestCredits().catch(console.error);
