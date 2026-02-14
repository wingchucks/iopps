/**
 * Check IOPPS JR employer account
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

async function checkIOPPSJR() {
    // From TOOLS.md: Org ID: osQ9E5wOVPVpCMcL09V7YSm0J0E2
    const orgId = "osQ9E5wOVPVpCMcL09V7YSm0J0E2";
    
    console.log(`Checking employer: ${orgId}\n`);
    
    const employerDoc = await db.collection("employers").doc(orgId).get();
    
    if (!employerDoc.exists) {
        console.log("Employer not found!");
        
        // Search by company name
        console.log("\nSearching for IOPPS JR by name...");
        const snapshot = await db.collection("employers").get();
        snapshot.forEach(doc => {
            const data = doc.data();
            const name = (data.companyName || data.name || "").toLowerCase();
            if (name.includes("iopps") || name.includes("jr")) {
                console.log(`Found: ${doc.id}`);
                console.log(`  Name: ${data.companyName || data.name}`);
                console.log(`  Credits: ${data.jobCredits || 0}`);
            }
        });
        return;
    }
    
    const data = employerDoc.data()!;
    console.log("Employer found!");
    console.log(`  Company: ${data.companyName || data.name}`);
    console.log(`  Email: ${data.email || 'none'}`);
    console.log(`  Job Credits: ${data.jobCredits || 0}`);
    console.log(`  User ID: ${data.userId || 'none'}`);
    console.log(`  Status: ${data.status || 'none'}`);
    console.log("\nFull data:", JSON.stringify(data, null, 2));
}

checkIOPPSJR().catch(console.error);
