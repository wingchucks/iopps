const admin = require('firebase-admin');

// Initialize with default credentials (requires GOOGLE_APPLICATION_CREDENTIALS env var)
// Or use the project default
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'iopps-c393e'
  });
}

const db = admin.firestore();

async function checkUser(email) {
  console.log(`Looking for user: ${email}\n`);
  
  // Check users collection
  const usersSnap = await db.collection('users').where('email', '==', email).get();
  
  if (usersSnap.empty) {
    console.log('No user found in users collection');
    
    // Try checking members directly by email
    const membersSnap = await db.collection('members').where('email', '==', email).get();
    if (!membersSnap.empty) {
      console.log('\nFound in members collection:');
      membersSnap.docs.forEach(doc => {
        console.log('Member ID:', doc.id);
        const data = doc.data();
        console.log('Display Name:', data.displayName);
        console.log('Role:', data.role);
      });
    }
    
    // Try employers
    const employersSnap = await db.collection('employers').where('email', '==', email).get();
    if (!employersSnap.empty) {
      console.log('\nFound in employers collection:');
      employersSnap.docs.forEach(doc => {
        console.log('Employer ID:', doc.id);
        const data = doc.data();
        console.log('Organization:', data.organizationName);
      });
    }
    return;
  }
  
  const userDoc = usersSnap.docs[0];
  const userId = userDoc.id;
  const userData = userDoc.data();
  
  console.log('User ID:', userId);
  console.log('User role:', userData.role);
  console.log('User data:', JSON.stringify(userData, null, 2));
  
  // Check member profile
  const memberSnap = await db.collection('members').doc(userId).get();
  if (memberSnap.exists) {
    console.log('\n✅ MEMBER PROFILE EXISTS');
    const memberData = memberSnap.data();
    console.log('Display Name:', memberData.displayName);
    console.log('Profile URL: https://www.iopps.ca/member/' + userId);
  } else {
    console.log('\n❌ No member profile');
  }
  
  // Check employer profile
  const employerSnap = await db.collection('employers').doc(userId).get();
  if (employerSnap.exists) {
    console.log('\n✅ EMPLOYER PROFILE EXISTS');
    const employerData = employerSnap.data();
    console.log('Organization:', employerData.organizationName);
  } else {
    console.log('\n❌ No employer profile');
  }
}

checkUser('estonsplace@gmail.com')
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
