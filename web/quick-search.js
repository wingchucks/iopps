// Quick Premium Partner Search
const admin = require('firebase-admin');

try {
  const serviceAccount = require('./firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('🔍 Connecting to Firebase...');
  
  const db = admin.firestore();
  
  // Simple query to test connection
  db.collection('employers').limit(5).get()
    .then(snapshot => {
      console.log(`✅ Connected! Found ${snapshot.size} sample records`);
      
      // Search all employers for Premium Partners
      return db.collection('employers').get();
    })
    .then(snapshot => {
      console.log(`📊 Total employers: ${snapshot.size}`);
      
      const matches = [];
      const searchTerms = ['saskatchewan', 'siga', 'westland', 'saskatoon tribal'];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const orgName = (data.organizationName || '').toLowerCase();
        
        for (let term of searchTerms) {
          if (orgName.includes(term)) {
            matches.push({
              id: doc.id,
              name: data.organizationName,
              status: data.status,
              verified: data.verified
            });
            break;
          }
        }
      });
      
      console.log('\n🎯 PREMIUM PARTNER MATCHES:');
      console.log('=' .repeat(40));
      
      if (matches.length === 0) {
        console.log('❌ No Premium Partners found');
      } else {
        matches.forEach(match => {
          console.log(`✅ ${match.name}`);
          console.log(`   ID: ${match.id}`);
          console.log(`   Status: ${match.status || 'N/A'}`);
          console.log(`   Verified: ${match.verified || false}`);
          console.log('');
        });
      }
      
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
    
} catch (error) {
  console.error('❌ Setup Error:', error.message);
  process.exit(1);
}