const admin = require('firebase-admin');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) envVars[key.trim()] = rest.join('=').trim().replace(/^"|"$/g, '');
});

const projectId = envVars.FIREBASE_PROJECT_ID;
const clientEmail = envVars.FIREBASE_CLIENT_EMAIL;
const privateKey = envVars.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

console.log('projectId:', projectId);
console.log('clientEmail:', clientEmail);
console.log('key starts:', privateKey.substring(0, 27));

admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
});

const db = admin.firestore();
db.collection('scholarships').limit(1).get()
  .then(snap => { console.log('✅ Connected! Docs:', snap.size); process.exit(0); })
  .catch(err => { console.error('❌', err.message); process.exit(1); });
