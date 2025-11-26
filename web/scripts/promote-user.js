const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('../firebase-admin-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const email = process.argv[2];
const role = process.argv[3] || 'moderator';

if (!email) {
    console.error('Please provide an email address.');
    console.log('Usage: node promote-user.js <email> [role]');
    process.exit(1);
}

async function promoteUser() {
    try {
        console.log(`Looking up user with email: ${email}...`);
        const userRecord = await admin.auth().getUserByEmail(email);
        const uid = userRecord.uid;

        console.log(`Found user ${uid}. Updating role to '${role}'...`);
        await db.collection('users').doc(uid).set({
            role: role
        }, { merge: true });

        console.log(`Successfully updated role for user ${email} (${uid}) to ${role}`);
        process.exit(0);
    } catch (error) {
        console.error('Error updating user:', error);
        process.exit(1);
    }
}

promoteUser();
