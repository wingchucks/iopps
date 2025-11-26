const admin = require('firebase-admin');
const serviceAccount = require('../firebase-admin-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const email = 'admin_test@iopps.ca';
const password = 'password123';
const displayName = 'Admin Test';

async function createAdmin() {
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

        console.log(`Setting role to 'moderator' for ${uid}...`);
        // Update Firestore user document
        await db.collection('users').doc(uid).set({
            id: uid,
            email,
            displayName,
            role: 'moderator',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log('Success! You can now log in as ' + email);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createAdmin();
