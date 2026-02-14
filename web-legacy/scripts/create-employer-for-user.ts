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

async function createEmployerForUser() {
    const email = process.argv[2];
    const companyName = process.argv[3] || "IOPPS";
    
    if (!email) {
        console.error("Usage: npx tsx scripts/create-employer-for-user.ts <email> [companyName]");
        process.exit(1);
    }
    
    console.log(`\n🔍 Finding user: ${email}\n`);
    
    // Find user
    const allUsers = await db.collection("users").get();
    const userDoc = allUsers.docs.find(d => d.data().email?.toLowerCase() === email.toLowerCase());
    
    if (!userDoc) {
        console.error(`❌ No user found with email: ${email}`);
        process.exit(1);
    }
    
    const userData = userDoc.data();
    console.log(`✅ Found user: ${userDoc.id}`);
    console.log(`   Current role: ${userData.role}`);
    console.log(`   Current employer ID: ${userData.employerId || "none"}`);
    
    if (userData.employerId) {
        console.log(`\n⚠️ User already has employer ID: ${userData.employerId}`);
        process.exit(0);
    }
    
    // Create employer record
    const employerData = {
        userId: userDoc.id,
        email: userData.email,
        companyName: companyName,
        name: companyName,
        contactName: userData.displayName || "Owner",
        status: "approved",
        verified: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    const employerRef = await db.collection("employers").add(employerData);
    console.log(`\n✅ Created employer record: ${employerRef.id}`);
    console.log(`   Company: ${companyName}`);
    
    // Update user with employer ID
    await db.collection("users").doc(userDoc.id).update({
        employerId: employerRef.id,
        role: "employer",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log(`✅ Linked employer to user`);
    console.log(`\n🎉 Done! User ${email} is now linked to employer "${companyName}"`);
}

createEmployerForUser().catch(console.error);
