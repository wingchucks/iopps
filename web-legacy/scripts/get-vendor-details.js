
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const serviceAccount = require('../firebase-admin-key.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function getVendor() {
    const slug = 'iopps-indigenous-opportunities-ja6lo4';
    console.log(`Fetching vendor with slug: ${slug}`);

    const snapshot = await db.collection('vendors').where('slug', '==', slug).get();

    if (snapshot.empty) {
        console.log('No vendor found with that slug.');
        return;
    }

    snapshot.forEach(doc => {
        console.log('Vendor Data:', JSON.stringify(doc.data(), null, 2));
    });
}

getVendor().catch(console.error);
