const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) envVars[key.trim()] = rest.join('=').trim().replace(/^"|"$/g, '');
});

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: envVars.FIREBASE_PROJECT_ID,
    clientEmail: envVars.FIREBASE_CLIENT_EMAIL,
    privateKey: envVars.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  })
});

const db = admin.firestore();

async function check() {
  const doc = await db.collection('jobs').doc('indigenous-cultural-resource-city-of-saskatoon').get();
  if (doc.exists) {
    const d = doc.data();
    console.log('✅ Job found');
    console.log('title:', d.title);
    console.log('status:', d.status);
    console.log('active:', d.active);
    console.log('employerName:', d.employerName);
    console.log('employerId:', d.employerId);
  } else {
    console.log('❌ Job not found in jobs collection');
    // Check posts collection
    const snap = await db.collection('posts').where('employerId', '==', 'city-of-saskatoon').get();
    console.log('Posts collection matches:', snap.size);
    snap.forEach(d => console.log(' -', d.id, d.data().title));
  }
  process.exit(0);
}

check().catch(err => { console.error(err); process.exit(1); });
