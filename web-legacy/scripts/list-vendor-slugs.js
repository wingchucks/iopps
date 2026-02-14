
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const serviceAccount = require('../firebase-admin-key.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function listVendorSlugs() {
    console.log('Fetching vendor slugs...');
    const snapshot = await db.collection('vendors').get();

    if (snapshot.empty) {
        console.log('No vendors found.');
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`SLUG: ${data.slug}`);
    });
}

listVendorSlugs().catch(console.error);
