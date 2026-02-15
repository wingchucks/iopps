
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const serviceAccount = require('../firebase-admin-key.json');

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

async function verifySerialization() {
    const slug = 'iopps-indigenous-opportunities-ja6lo4';
    console.log(`Testing serialization for slug: ${slug}`);

    try {
        const db = getFirestore();
        const snapshot = await db.collection('vendors').where('slug', '==', slug).get();

        if (snapshot.empty) {
            console.log('No vendor found.');
            return;
        }

        const doc = snapshot.docs[0];
        const data = doc.data();

        console.log('Raw Firestore Data Types:');
        console.log('createdAt:', data.createdAt?.constructor.name);
        console.log('updatedAt:', data.updatedAt?.constructor.name);

        // Simulate the serialization logic
        if (data.createdAt?.toDate) data.createdAt = data.createdAt.toDate();
        if (data.updatedAt?.toDate) data.updatedAt = data.updatedAt.toDate();

        console.log('\nSerialized Data Types:');
        console.log('createdAt:', data.createdAt?.constructor.name);
        console.log('updatedAt:', data.updatedAt?.constructor.name);

        if (data.createdAt instanceof Date) {
            console.log('\nSUCCESS: createdAt is a Date object!');
        } else {
            console.log('\nFAIL: createdAt is NOT a Date object.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

verifySerialization();
