const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkEmployers() {
  const employersRef = db.collection('employers');

  // Try the exact query the app uses
  console.log('Testing query: status == "approved" orderBy createdAt desc');
  try {
    const q = employersRef
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .limit(10);
    const results = await q.get();
    console.log('Query returned:', results.size, 'documents');
    results.forEach(doc => {
      console.log('  -', doc.data().organizationName, '| createdAt:', doc.data().createdAt);
    });
  } catch (error) {
    console.error('Query failed:', error.message);
  }

  // Check if employers have createdAt
  console.log('\nChecking createdAt field on all employers:');
  const allEmployers = await employersRef.limit(5).get();
  allEmployers.forEach(doc => {
    const data = doc.data();
    console.log('  -', data.organizationName, '| createdAt:', data.createdAt, '| status:', data.status);
  });
}

checkEmployers().then(() => process.exit(0));
