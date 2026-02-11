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

async function checkEmployer() {
    const searchTerm = process.argv[2] || "Northern Lights";
    
    console.log(`\n🔍 Searching for employer: ${searchTerm}\n`);
    
    const emps = await db.collection("employers").get();
    const match = emps.docs.find(d => {
        const data = d.data();
        return data.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               data.name?.toLowerCase().includes(searchTerm.toLowerCase());
    });
    
    if (match) {
        const data = match.data();
        console.log(`✅ Found employer!`);
        console.log(`   ID: ${match.id}`);
        console.log(`   Company Name: ${data.companyName || data.name}`);
        console.log(`   Slug: ${data.slug || "NOT SET"}`);
        console.log(`   Status: ${data.status || "NOT SET"}`);
        console.log(`   Published: ${data.published}`);
        console.log(`   Verified: ${data.verified}`);
        console.log(`   Active: ${data.active}`);
        console.log(`   User ID: ${data.userId || "NOT SET"}`);
        console.log(`   Email: ${data.email || "NOT SET"}`);
    } else {
        console.log(`❌ No employer found matching: ${searchTerm}`);
    }
}

checkEmployer().catch(console.error);
