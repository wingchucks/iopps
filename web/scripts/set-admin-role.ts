/**
 * Set admin or moderator role for a user
 * 
 * Usage:
 *   npx tsx scripts/set-admin-role.ts <email> [community|employer|moderator|admin]
 *
 * Examples:
 *   npx tsx scripts/set-admin-role.ts test@iopps.ca admin
 *   npx tsx scripts/set-admin-role.ts user@example.com community
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

async function setAdminRole() {
    const email = process.argv[2];
    const role = process.argv[3] || "admin";
    
    if (!email) {
        console.error("❌ Usage: npx tsx scripts/set-admin-role.ts <email> [community|employer|moderator|admin]");
        process.exit(1);
    }
    
    const validRoles = ["community", "employer", "moderator", "admin"];
    if (!validRoles.includes(role)) {
        console.error(`❌ Role must be one of: ${validRoles.join(", ")}`);
        process.exit(1);
    }
    
    console.log(`\n🔍 Looking for user with email: ${email}\n`);
    
    // Find user by email
    const usersSnapshot = await db.collection("users")
        .where("email", "==", email.toLowerCase())
        .limit(1)
        .get();
    
    if (usersSnapshot.empty) {
        // Try case-insensitive search
        const allUsersSnapshot = await db.collection("users").get();
        const matchingUser = allUsersSnapshot.docs.find(doc => 
            doc.data().email?.toLowerCase() === email.toLowerCase()
        );
        
        if (!matchingUser) {
            console.error(`❌ No user found with email: ${email}`);
            console.log("\n💡 The user must sign up first before you can set their role.");
            console.log("   Or add their email to NEXT_PUBLIC_SUPER_ADMIN_EMAILS in .env.local");
            process.exit(1);
        }
        
        // Found via case-insensitive search
        const userData = matchingUser.data();
        console.log(`✅ Found user: ${matchingUser.id}`);
        console.log(`   Current role: ${userData.role || 'none'}`);
        
        await db.collection("users").doc(matchingUser.id).update({
            role: role,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`\n🎉 Successfully set role to '${role}' for ${email}`);
        return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    
    console.log(`✅ Found user: ${userDoc.id}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Current role: ${userData.role || 'none'}`);
    
    // Update role
    await db.collection("users").doc(userDoc.id).update({
        role: role,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`\n🎉 Successfully set role to '${role}' for ${email}`);
}

setAdminRole().catch(console.error);
