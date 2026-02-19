const admin = require('firebase-admin');
const fs = require('fs');

async function searchPremiumPartners() {
  let results = [];
  
  try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    const db = admin.firestore();
    results.push('🔍 Connecting to Firebase...\n');
    
    const snapshot = await db.collection('employers').get();
    results.push(`📊 Total employers: ${snapshot.size}\n`);
    
    const matches = [];
    const searchTerms = ['saskatchewan', 'siga', 'westland', 'saskatoon tribal'];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const orgName = (data.organizationName || '').toLowerCase();
      const companyName = (data.companyName || '').toLowerCase();
      
      for (let term of searchTerms) {
        if (orgName.includes(term) || companyName.includes(term)) {
          matches.push({
            id: doc.id,
            organizationName: data.organizationName,
            companyName: data.companyName,
            status: data.status,
            verified: data.verified,
            approvedAt: data.approvedAt,
            term: term
          });
          break;
        }
      }
    });
    
    results.push('\n🎯 PREMIUM PARTNER MATCHES:\n');
    results.push('=' .repeat(50) + '\n');
    
    if (matches.length === 0) {
      results.push('❌ No Premium Partners found\n');
    } else {
      matches.forEach((match, index) => {
        results.push(`\n${index + 1}. **${match.organizationName || match.companyName}**\n`);
        results.push(`   ID: ${match.id}\n`);
        results.push(`   Status: ${match.status || 'N/A'}\n`);
        results.push(`   Verified: ${match.verified || false}\n`);
        results.push(`   Approved: ${match.approvedAt ? new Date(match.approvedAt._seconds * 1000).toLocaleDateString() : 'N/A'}\n`);
        results.push(`   Matched on: "${match.term}"\n`);
      });
    }
    
    results.push('\n✅ Search completed!\n');
    
    // Write results to file
    fs.writeFileSync('premium-partner-results.txt', results.join(''));
    process.exit(0);
    
  } catch (error) {
    results.push(`❌ Error: ${error.message}\n`);
    fs.writeFileSync('premium-partner-results.txt', results.join(''));
    process.exit(1);
  }
}

searchPremiumPartners();