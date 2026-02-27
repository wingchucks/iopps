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

const fixes = {
  '2spirits-powwow-2026': 'Pow Wow',
  'fnuniv-spring-celebration-powwow-2026': 'Pow Wow',
  'kainai-powwow-2026': 'Pow Wow',
  'kamloopa-powwow-2026': 'Pow Wow',
  'siksika-nation-fair-powwow-2026': 'Pow Wow',
  'sturgeon-lake-powwow-2026': 'Pow Wow',
  'manito-ahbee-powwow-2026': 'Pow Wow',
};

async function fix() {
  for (const [id, eventType] of Object.entries(fixes)) {
    await db.collection('events').doc(id).update({ eventType });
    console.log(`✅ ${id} → "${eventType}"`);
  }
  console.log('Done.');
  process.exit(0);
}

fix().catch(err => { console.error(err); process.exit(1); });
