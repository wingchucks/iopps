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

async function fix() {
  // Hide IOPPS JR from partners - set plan to free
  await db.collection('organizations').doc('iopps-jr').update({
    plan: 'free',
    verified: false,
  });
  console.log('✅ IOPPS JR hidden from partners');

  // Find Northern Lights org
  const nlSnap = await db.collection('organizations').where('name', '==', 'Northern Lights Indigenous Consulting').get();
  if (!nlSnap.empty) {
    for (const doc of nlSnap.docs) {
      await doc.ref.update({ plan: 'free', verified: false });
      console.log('✅ Northern Lights hidden from partners:', doc.id);
    }
  } else {
    console.log('Northern Lights not found by name, trying employerId...');
    const snap2 = await db.collection('organizations').where('employerId', '==', 'oXzGOKC8Q7Y3PHydWAZN').get();
    for (const doc of snap2.docs) {
      await doc.ref.update({ plan: 'free', verified: false });
      console.log('✅ Northern Lights hidden from partners:', doc.id);
    }
  }

  process.exit(0);
}

fix().catch(err => { console.error(err); process.exit(1); });
