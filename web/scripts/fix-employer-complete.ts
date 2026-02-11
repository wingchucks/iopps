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

async function fixEmployerComplete() {
    const employerId = process.argv[2];
    
    if (!employerId) {
        console.error("Usage: npx tsx scripts/fix-employer-complete.ts <employerId>");
        process.exit(1);
    }
    
    const empDoc = await db.collection("employers").doc(employerId).get();
    
    if (!empDoc.exists) {
        console.error(`❌ Employer not found: ${employerId}`);
        process.exit(1);
    }
    
    const data = empDoc.data()!;
    const companyName = data.companyName || data.name || "Unknown";
    const slug = data.slug || companyName.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    
    console.log(`\n📋 Fixing employer: ${companyName}`);
    console.log(`   ID: ${employerId}`);
    console.log(`   Current slug: ${data.slug || "NOT SET"}`);
    console.log(`   Current status: ${data.status || "NOT SET"}`);
    console.log(`   Current publicationStatus: ${data.publicationStatus || "NOT SET"}`);
    
    // Update with all required fields for public visibility
    await db.collection("employers").doc(employerId).update({
        slug: slug,
        organizationName: companyName,  // Required by OrganizationProfile type
        status: "approved",
        publicationStatus: "PUBLISHED",  // THIS IS THE KEY FIELD
        verified: true,
        active: true,
        isDirectoryVisible: true,
        location: data.location || "Saskatchewan",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log(`\n✅ Employer profile fixed!`);
    console.log(`   slug: ${slug}`);
    console.log(`   status: approved`);
    console.log(`   publicationStatus: PUBLISHED`);
    console.log(`   isDirectoryVisible: true`);
    console.log(`\n🔗 Public URL: https://www.iopps.ca/organizations/${slug}`);
}

fixEmployerComplete().catch(console.error);
