/**
 * Fix all existing employer accounts that are missing required fields
 * 
 * This script:
 * 1. Finds all employer users missing employerId
 * 2. Links them to their employer records (or creates one)
 * 3. Ensures all approved employers have correct publication fields
 * 
 * Usage:
 *   npx tsx scripts/fix-all-employers.ts [--dry-run]
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

function generateSlug(name: string): string {
    const baseSlug = name
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 50);
    const uniqueSuffix = Math.random().toString(36).substring(2, 8);
    return `${baseSlug}-${uniqueSuffix}`;
}

async function fixAllEmployers() {
    const dryRun = process.argv.includes("--dry-run");
    
    console.log(`\n🔧 Fixing all employer accounts${dryRun ? " (DRY RUN)" : ""}...\n`);
    
    let usersFixed = 0;
    let employersFixed = 0;
    let employersCreated = 0;
    
    // Step 1: Find all users with role "employer"
    const usersSnapshot = await db.collection("users").where("role", "==", "employer").get();
    console.log(`Found ${usersSnapshot.size} employer users\n`);
    
    for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        const email = userData.email;
        const displayName = userData.displayName || "Unknown Organization";
        
        console.log(`\n📋 Checking user: ${email || userId}`);
        
        // Check if user has employerId linked
        if (!userData.employerId) {
            console.log(`   ⚠️ Missing employerId`);
            
            // Check if employer record exists with this userId
            let employerDoc = await db.collection("employers").doc(userId).get();
            
            if (!employerDoc.exists) {
                // Try query by userId field
                const empQuery = await db.collection("employers").where("userId", "==", userId).limit(1).get();
                if (!empQuery.empty) {
                    employerDoc = empQuery.docs[0];
                }
            }
            
            if (employerDoc.exists) {
                // Link existing employer
                console.log(`   ✅ Found employer record: ${employerDoc.id}`);
                if (!dryRun) {
                    await db.collection("users").doc(userId).update({
                        employerId: employerDoc.id,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
                usersFixed++;
            } else {
                // Create employer record
                console.log(`   📝 Creating new employer record...`);
                const slug = generateSlug(displayName);
                if (!dryRun) {
                    await db.collection("employers").doc(userId).set({
                        id: userId,
                        userId: userId,
                        organizationName: displayName,
                        companyName: displayName,
                        slug: slug,
                        email: email,
                        contactEmail: email,
                        status: "pending",
                        publicationStatus: "DRAFT",
                        verified: false,
                        isDirectoryVisible: false,
                        description: "",
                        website: "",
                        location: "",
                        logoUrl: "",
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    await db.collection("users").doc(userId).update({
                        employerId: userId,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
                employersCreated++;
                usersFixed++;
            }
        } else {
            console.log(`   ✅ Has employerId: ${userData.employerId}`);
        }
    }
    
    // Step 2: Fix all approved employers missing publication fields
    console.log(`\n\n🔧 Fixing approved employers missing publication fields...\n`);
    
    const employersSnapshot = await db.collection("employers").where("status", "==", "approved").get();
    console.log(`Found ${employersSnapshot.size} approved employers\n`);
    
    for (const empDoc of employersSnapshot.docs) {
        const empData = empDoc.data();
        const needsFix = !empData.publicationStatus || !empData.slug || !empData.isDirectoryVisible;
        
        if (needsFix) {
            console.log(`\n📋 Fixing: ${empData.organizationName || empData.companyName || empDoc.id}`);
            
            const updates: any = {
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            
            if (!empData.publicationStatus) {
                updates.publicationStatus = "PUBLISHED";
                console.log(`   + publicationStatus: PUBLISHED`);
            }
            
            if (!empData.slug) {
                updates.slug = generateSlug(empData.organizationName || empData.companyName || empDoc.id);
                console.log(`   + slug: ${updates.slug}`);
            }
            
            if (!empData.isDirectoryVisible) {
                updates.isDirectoryVisible = true;
                console.log(`   + isDirectoryVisible: true`);
            }
            
            if (!empData.verified) {
                updates.verified = true;
                console.log(`   + verified: true`);
            }
            
            if (!empData.companyName && empData.organizationName) {
                updates.companyName = empData.organizationName;
                console.log(`   + companyName: ${empData.organizationName}`);
            }
            
            if (!dryRun) {
                await db.collection("employers").doc(empDoc.id).update(updates);
            }
            employersFixed++;
        }
    }
    
    console.log(`\n\n✅ DONE!`);
    console.log(`   Users fixed (employerId linked): ${usersFixed}`);
    console.log(`   Employer records created: ${employersCreated}`);
    console.log(`   Approved employers fixed: ${employersFixed}`);
    
    if (dryRun) {
        console.log(`\n⚠️ This was a dry run. No changes were made.`);
        console.log(`   Run without --dry-run to apply changes.`);
    }
}

fixAllEmployers().catch(console.error);
