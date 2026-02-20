const admin = require('firebase-admin');
const fs = require('fs');

const projectId = 'iopps-c2224';
const clientEmail = 'firebase-adminsdk-fbsvc@iopps-c2224.iam.gserviceaccount.com';

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/FIREBASE_PRIVATE_KEY="([^"]+)"/);
if (!match) { console.log('No FIREBASE_PRIVATE_KEY found'); process.exit(1); }
const privateKey = match[1].replace(/\\n/g, '\n');

admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
const db = admin.firestore();

async function cleanup() {
  const jobPosts = await db.collection('posts').where('type', '==', 'job').get();
  console.log('Found ' + jobPosts.size + ' job posts to delete');

  let count = 0;
  let batch = db.batch();
  for (const doc of jobPosts.docs) {
    batch.delete(doc.ref);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      console.log('Committed batch of 400');
      batch = db.batch();
    }
  }
  if (count % 400 !== 0) await batch.commit();
  console.log('DELETED ' + count + ' fake job posts');

  const remaining = await db.collection('posts').get();
  console.log('Remaining posts: ' + remaining.size);
  const types = {};
  remaining.forEach(d => { const t = d.data().type || 'unknown'; types[t] = (types[t] || 0) + 1; });
  console.log('By type:', JSON.stringify(types));
}

cleanup().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
