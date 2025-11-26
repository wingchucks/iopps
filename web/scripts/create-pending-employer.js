const admin = require('firebase-admin');
const serviceAccount = require('../firebase-admin-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const email = 'employer_test@iopps.ca';
const password = 'password123';
const displayName = 'Test Employer';

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
            organizationName: 'Test Corp',
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
