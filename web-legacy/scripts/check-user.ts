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

async function checkUser() {
    const email = process.argv[2] || "wingchucks@gmail.com";
    
    console.log(`\n🔍 Checking: ${email}\n`);
    
    // Check users collection
    const allUsers = await db.collection("users").get();
    const match = allUsers.docs.find(d => d.data().email?.toLowerCase() === email.toLowerCase());
    
    if (match) {
        const data = match.data();
        console.log(`✅ Found user!`);
        console.log(`   UID: ${match.id}`);
        console.log(`   Email: ${data.email}`);
        console.log(`   Role: ${data.role || "none"}`);
        console.log(`   Display Name: ${data.displayName || "none"}`);
        console.log(`   Employer ID: ${data.employerId || "none"}`);
        console.log(`   Created: ${data.createdAt?.toDate?.() || "unknown"}`);
        
        // If employer, check employer record
        if (data.employerId) {
            const empDoc = await db.collection("employers").doc(data.employerId).get();
            if (empDoc.exists) {
                const empData = empDoc.data();
                console.log(`\n   📋 Employer Record:`);
                console.log(`      Company: ${empData?.companyName || empData?.name}`);
                console.log(`      Status: ${empData?.status || "unknown"}`);
            }
        }
    } else {
        console.log(`❌ No user found with email: ${email}`);
    }
}

checkUser().catch(console.error);
