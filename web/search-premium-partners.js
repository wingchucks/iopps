const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

async function searchPremiumPartners() {
  try {
    // Initialize Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    const db = admin.firestore();
    console.log('🔍 Searching for Premium Partner employers...\n');
    
    // Get all employers
    const snapshot = await db.collection('employers').get();
    console.log(`📊 Total employers in database: ${snapshot.size}\n`);
    
    // Search for our target companies
    const targets = [
      'saskatchewan indian gaming',
      'siga',
      'westland insurance',
      'westland',
      'saskatoon tribal council',
      'saskatoon tribal'
    ];
    
    let matches = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const orgName = (data.organizationName || '').toLowerCase();
      const companyName = (data.companyName || '').toLowerCase();
      
      // Check if any target matches the organization or company name
      for (let target of targets) {
        if (orgName.includes(target) || companyName.includes(target)) {
          matches.push({
            id: doc.id,
            organizationName: data.organizationName,
            companyName: data.companyName,
            status: data.status,
            verified: data.verified,
            approvedAt: data.approvedAt,
            target: target
          });
          break; // Avoid duplicate matches for same company
        }
      }
    });
    
    console.log('🎯 Premium Partner Matches Found:');
    console.log('=' .repeat(50));
    
    if (matches.length === 0) {
      console.log('❌ No matches found');
      
      // Show some sample organization names to help debug
      console.log('\n📝 Sample organization names in database:');
      let count = 0;
      snapshot.forEach(doc => {
        if (count < 10) {
          const data = doc.data();
          console.log(`- ${data.organizationName || 'N/A'}`);
          count++;
        }
      });
    } else {
      matches.forEach((match, index) => {
        console.log(`\n${index + 1}. **${match.organizationName || match.companyName}**`);
        console.log(`   ID: ${match.id}`);
        console.log(`   Status: ${match.status || 'N/A'}`);
        console.log(`   Verified: ${match.verified || false}`);
        console.log(`   Approved: ${match.approvedAt ? new Date(match.approvedAt._seconds * 1000).toLocaleDateString() : 'N/A'}`);
        console.log(`   Matched on: "${match.target}"`);
      });
    }
    
    console.log('\n✅ Search completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error searching for Premium Partners:', error.message);
    process.exit(1);
  }
}

// Run the search
searchPremiumPartners();