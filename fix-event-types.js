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

// Normalize map: anything matching these (case-insensitive) → standard value
const normalize = (type) => {
  if (!type) return 'other';
  const t = type.toLowerCase().trim();
  if (t === 'conference') return 'Conference';
  if (t === 'powwow' || t === 'pow wow' || t === 'pow-wow') return 'Pow Wow';
  if (t === 'cultural') return 'Cultural';
  if (t === 'career fair' || t === 'careerfair') return 'Career Fair';
  if (t === 'sport' || t === 'sports') return 'Sports';
  if (t === 'festival') return 'Festival';
  if (t === 'other') return 'Other';
  // Capitalize first letter
  return type.charAt(0).toUpperCase() + type.slice(1);
};

async function fix() {
  const snap = await db.collection('events').get();
  let fixed = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const current = data.eventType || data.type;
    const normalized = normalize(current);

    if (current !== normalized) {
      await doc.ref.update({ eventType: normalized });
      console.log(`✅ ${doc.id}: "${current}" → "${normalized}"`);
      fixed++;
    } else {
      // Make sure eventType field exists
      if (!data.eventType) {
        await doc.ref.update({ eventType: normalized });
        console.log(`✅ ${doc.id}: set eventType="${normalized}"`);
        fixed++;
      }
    }
  }

  console.log(`\nDone. Fixed ${fixed} events.`);
  process.exit(0);
}

fix().catch(err => { console.error(err); process.exit(1); });
