/**
 * Find the test user and their employer data
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

async function findTestUser() {
    console.log("Searching all users...\n");
    
    const usersSnapshot = await db.collection("users").get();
    
    console.log(`Total users: ${usersSnapshot.size}\n`);
    
    usersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.email?.includes("test") || data.email?.includes("iopps")) {
            console.log(`User ID: ${doc.id}`);
            console.log(`  Email: ${data.email}`);
            console.log(`  Role: ${data.role}`);
            console.log(`  Employer ID: ${data.employerId || 'none'}`);
            console.log(`  Job Credits: ${data.jobCredits || 0}`);
            console.log(`  Created: ${data.createdAt?.toDate?.() || data.createdAt}`);
            console.log("");
        }
    });
    
    // Also check employers with companyName containing "test" or "iopps"
    console.log("\nSearching employers...\n");
    const employersSnapshot = await db.collection("employers").get();
    
    employersSnapshot.forEach(doc => {
        const data = doc.data();
        const name = (data.companyName || data.name || "").toLowerCase();
        if (name.includes("test") || name.includes("iopps") || name.includes("jr")) {
            console.log(`Employer ID: ${doc.id}`);
            console.log(`  Company: ${data.companyName || data.name}`);
            console.log(`  Email: ${data.email || 'none'}`);
            console.log(`  Job Credits: ${data.jobCredits || 0}`);
            console.log(`  User ID: ${data.userId || 'none'}`);
            console.log("");
        }
    });
}

findTestUser().catch(console.error);
