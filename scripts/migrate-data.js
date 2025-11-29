const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Production App (Source)
const serviceAccountPath = path.join(__dirname, '../service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ service-account.json not found!');
    console.error('Please download it from Firebase Console and place it in the root directory.');
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

const prodApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
}, 'prod');

const prodDb = prodApp.firestore();
const prodAuth = prodApp.auth();

// Initialize Local Emulator App (Destination)
// We use a separate app instance pointing to the emulator
process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
process.env['FIREBASE_AUTH_EMULATOR_HOST'] = 'localhost:9099';
process.env['GCLOUD_PROJECT'] = 'demo-iopps';

const localApp = admin.initializeApp({
    projectId: 'demo-iopps',
}, 'local');

const localDb = localApp.firestore();
const localAuth = localApp.auth();

async function migrateCollection(collectionName) {
    console.log(`\n📦 Migrating collection: ${collectionName}...`);

    try {
        const snapshot = await prodDb.collection(collectionName).get();

        if (snapshot.empty) {
            console.log(`   ⚠️ No documents found in ${collectionName}.`);
            return;
        }

        console.log(`   Found ${snapshot.size} documents.`);

        let batch = localDb.batch();
        let count = 0;
        let total = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const docRef = localDb.collection(collectionName).doc(doc.id);

            batch.set(docRef, data);
            count++;
            total++;

            if (count >= 400) {
                await batch.commit();
                console.log(`   Saved ${total} documents...`);
                batch = localDb.batch();
                count = 0;
            }
        }

        if (count > 0) {
            await batch.commit();
        }

        console.log(`   ✅ Successfully migrated ${total} documents from ${collectionName}.`);
    } catch (error) {
        console.error(`   ❌ Error migrating ${collectionName}:`, error);
    }
}

async function migrateAuthUsers() {
    console.log(`\n👤 Migrating Auth Users...`);

    try {
        const listUsersResult = await prodAuth.listUsers(1000);
        const users = listUsersResult.users;

        console.log(`   Found ${users.length} users.`);

        let successCount = 0;
        let errorCount = 0;

        for (const user of users) {
            try {
                await localAuth.importUsers([{
                    uid: user.uid,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    phoneNumber: user.phoneNumber,
                    disabled: user.disabled,
                    metadata: user.metadata,
                    providerData: user.providerData,
                }]);
                successCount++;
            } catch (error) {
                if (error.code === 'auth/uid-already-exists') {
                    // User already exists, skip
                } else {
                    console.error(`   Failed to import user ${user.email}:`, error.message);
                    errorCount++;
                }
            }
        }

        console.log(`   ✅ Imported ${successCount} users.`);
        if (errorCount > 0) console.log(`   ⚠️ Failed to import ${errorCount} users.`);

    } catch (error) {
        console.error('   ❌ Error migrating users:', error);
    }
}

async function run() {
    console.log('🚀 Starting Migration...');

    await migrateAuthUsers();

    const collections = [
        'users',
        'jobs',
        'conferences',
        'scholarships',
        'liveStreams',
        'employers',
        'applications'
    ];

    for (const col of collections) {
        await migrateCollection(col);
    }

    console.log('\n✨ Migration Complete!');
    process.exit(0);
}

run();
