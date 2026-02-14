const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const serviceAccount = require('../firebase-admin-key.json');

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

async function checkVendorStatus() {
    const slug = 'iopps-indigenous-opportunities-ja6lo4';
    const db = getFirestore();
    const snapshot = await db.collection('vendors').where('slug', '==', slug).get();

    if (snapshot.empty) {
        console.log('No vendor found with slug:', slug);
        return;
    }

    const vendor = snapshot.docs[0].data();
    console.log('Vendor ID:', snapshot.docs[0].id);
    console.log('Status:', vendor.status);
    console.log('Verification Status:', vendor.verificationStatus);
    console.log('Active:', vendor.active);
    console.log('Approval Status:', vendor.approvalStatus);
}

checkVendorStatus();
