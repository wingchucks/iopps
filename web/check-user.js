// Check Firebase user profile for wingchucks@gmail.com
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccountKey = require('./firebase-service-account.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey)
  });
} catch (error) {
  // Already initialized
}

const db = admin.firestore();

async function checkUser() {
  try {
    console.log('Checking user: wingchucks@gmail.com\n');
    
    // Query users collection for this email
    const usersRef = db.collection('users');
    const userQuery = await usersRef.where('email', '==', 'wingchucks@gmail.com').get();
    
    if (userQuery.empty) {
      console.log('❌ User not found in Firestore users collection');
      
      // Check Firebase Auth
      try {
        const userRecord = await admin.auth().getUserByEmail('wingchucks@gmail.com');
        console.log('✅ Found in Firebase Auth:');
        console.log(`   UID: ${userRecord.uid}`);
        console.log(`   Email: ${userRecord.email}`);
        console.log(`   Email verified: ${userRecord.emailVerified}`);
        console.log(`   Created: ${userRecord.metadata.creationTime}`);
        console.log(`   Last sign in: ${userRecord.metadata.lastSignInTime || 'Never'}`);
      } catch (authError) {
        console.log('❌ User not found in Firebase Auth either');
      }
    } else {
      userQuery.forEach(doc => {
        const userData = doc.data();
        console.log('✅ User found in Firestore:');
        console.log(`   Document ID: ${doc.id}`);
        console.log(`   Email: ${userData.email}`);
        console.log(`   Name: ${userData.name || 'Not set'}`);
        console.log(`   User Type: ${userData.userType || 'Not set'}`);
        console.log(`   Profile Type: ${userData.profileType || 'Not set'}`);
        console.log(`   Status: ${userData.status || 'Not set'}`);
        
        // Check if employer profile
        if (userData.userType === 'employer' || userData.profileType === 'employer') {
          console.log('\n🏢 EMPLOYER PROFILE DETECTED');
          
          // Check employer details
          if (userData.organization) {
            console.log(`   Organization: ${userData.organization}`);
          }
          if (userData.companyName) {
            console.log(`   Company: ${userData.companyName}`);  
          }
        } else {
          console.log('\n👤 Regular user profile (not employer)');
        }
        
        console.log('\n📄 Full profile data:');
        console.log(JSON.stringify(userData, null, 2));
      });
    }
    
    // Also check employers collection specifically
    console.log('\n--- Checking employers collection ---');
    const employersRef = db.collection('employers');
    const employerQuery = await employersRef.where('email', '==', 'wingchucks@gmail.com').get();
    
    if (!employerQuery.empty) {
      console.log('✅ Found in employers collection:');
      employerQuery.forEach(doc => {
        const employerData = doc.data();
        console.log(`   Document ID: ${doc.id}`);
        console.log(`   Company: ${employerData.companyName || 'Not set'}`);
        console.log(`   Status: ${employerData.status || 'Not set'}`);
        console.log(`   Approved: ${employerData.approved || false}`);
        
        console.log('\n📄 Full employer data:');
        console.log(JSON.stringify(employerData, null, 2));
      });
    } else {
      console.log('❌ Not found in employers collection');
    }
    
  } catch (error) {
    console.error('Error checking user:', error);
  }
}

checkUser().then(() => {
  console.log('\n✅ Check complete');
  process.exit(0);
}).catch(error => {
  console.error('Script error:', error);
  process.exit(1);
});