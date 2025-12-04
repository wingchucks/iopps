const admin = require('firebase-admin');
const crypto = require('crypto');

// Initialize using environment variables (same as the app)
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Firebase credentials. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.');
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        })
    });
}

const db = admin.firestore();

// Get email from command line or use default
const email = process.argv[2] || 'employer_test@iopps.ca';
const displayName = process.argv[3] || 'Test Employer';
const organizationName = process.argv[4] || 'Test Corp';

// Generate a secure random password
const password = crypto.randomBytes(16).toString('hex');

async function createEmployer() {
    try {
        let uid;
        try {
            const userRecord = await admin.auth().getUserByEmail(email);
            uid = userRecord.uid;
            console.log(`User ${email} already exists (${uid})`);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log(`Creating user ${email}...`);
                const userRecord = await admin.auth().createUser({
                    email,
                    password,
                    displayName
                });
                uid = userRecord.uid;
                console.log(`Created user ${uid}`);
                console.log(`Generated password: ${password}`);
                console.log('⚠️  Save this password! The user should change it after first login.');
            } else {
                throw error;
            }
        }

        console.log(`Setting role to 'employer' and status to 'pending' for ${uid}...`);

        // Update User Doc
        await db.collection('users').doc(uid).set({
            id: uid,
            email,
            displayName,
            role: 'employer',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Create Employer Profile
        await db.collection('employers').doc(uid).set({
            id: uid,
            userId: uid,
            organizationName,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log('Success! Created pending employer ' + email);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createEmployer();
