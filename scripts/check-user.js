const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkAndFixUser() {
  // Find user by email
  const usersSnap = await db.collection('users').where('email', '==', 'nathan.arias@iopps.ca').get();

  if (usersSnap.empty) {
    console.log('No user found with email nathan.arias@iopps.ca');
    console.log('Looking for any users...');
    const allUsers = await db.collection('users').limit(5).get();
    allUsers.forEach(doc => {
      const d = doc.data();
      console.log('  User:', doc.id, '| email:', d.email, '| role:', d.role);
    });
  } else {
    usersSnap.forEach(doc => {
      const d = doc.data();
      console.log('Found user:', doc.id);
      console.log('  email:', d.email);
      console.log('  role:', d.role);
      console.log('  displayName:', d.displayName);
    });
  }
}

checkAndFixUser().then(() => process.exit(0));
