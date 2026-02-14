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

async function fixEmployerProfile() {
    const employerId = process.argv[2];
    const slug = process.argv[3];
    
    if (!employerId) {
        console.error("Usage: npx tsx scripts/fix-employer-profile.ts <employerId> [slug]");
        process.exit(1);
    }
    
    const empDoc = await db.collection("employers").doc(employerId).get();
    
    if (!empDoc.exists) {
        console.error(`❌ Employer not found: ${employerId}`);
        process.exit(1);
    }
    
    const data = empDoc.data()!;
    const companyName = data.companyName || data.name || "Unknown";
    const generatedSlug = slug || companyName.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    
    console.log(`\n📋 Updating employer: ${companyName}`);
    console.log(`   ID: ${employerId}`);
    console.log(`   New slug: ${generatedSlug}`);
    
    await db.collection("employers").doc(employerId).update({
        slug: generatedSlug,
        status: "approved",
        published: true,
        verified: true,
        active: true,
        location: data.location || "Saskatoon, Saskatchewan",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log(`\n✅ Employer profile updated!`);
    console.log(`   Public URL: /organizations/${generatedSlug}`);
}

fixEmployerProfile().catch(console.error);
