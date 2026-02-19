const admin = require('firebase-admin');

async function checkSIGARSSFeed() {
  try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    const db = admin.firestore();
    console.log('🔍 CHECKING SIGA RSS FEED STATUS...');
    console.log('=' .repeat(50));
    
    // SIGA Details
    const sigaId = 'sR78eEVUvvVaOFLGcUudlD0s0gq1';
    console.log(`📋 SIGA Firebase ID: ${sigaId}`);
    
    // 1. Check SIGA employer account details
    console.log('\n📊 1. CHECKING SIGA EMPLOYER ACCOUNT...');
    const sigaDoc = await db.collection('employers').doc(sigaId).get();
    
    if (sigaDoc.exists) {
      const sigaData = sigaDoc.data();
      console.log(`   ✅ Organization: ${sigaData.organizationName}`);
      console.log(`   ✅ Status: ${sigaData.status}`);
      console.log(`   ✅ Premium Partner: ${sigaData.isPremiumPartner || false}`);
      console.log(`   ✅ Website: ${sigaData.website || 'N/A'}`);
      console.log(`   ✅ Verified: ${sigaData.verified}`);
    } else {
      console.log('   ❌ SIGA employer account not found!');
      return;
    }
    
    // 2. Check for RSS feed configurations
    console.log('\n📡 2. CHECKING RSS FEED CONFIGURATIONS...');
    const rssSnapshot = await db.collection('rssFeeds').where('employerId', '==', sigaId).get();
    
    if (!rssSnapshot.empty) {
      console.log(`   ✅ Found ${rssSnapshot.size} RSS feed(s) for SIGA`);
      
      rssSnapshot.forEach(doc => {
        const rssData = doc.data();
        console.log(`   📡 RSS Feed ID: ${doc.id}`);
        console.log(`   📡 Feed URL: ${rssData.feedUrl || 'N/A'}`);
        console.log(`   📡 Status: ${rssData.status || 'N/A'}`);
        console.log(`   📡 Last Updated: ${rssData.lastUpdated ? new Date(rssData.lastUpdated._seconds * 1000).toLocaleString() : 'N/A'}`);
        console.log(`   📡 Active: ${rssData.isActive !== false ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('   ⚠️  No RSS feeds found in rssFeeds collection for SIGA');
    }
    
    // 3. Check recent jobs from SIGA
    console.log('\n💼 3. CHECKING RECENT SIGA JOBS...');
    const jobsSnapshot = await db.collection('jobs')
      .where('employerId', '==', sigaId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    if (!jobsSnapshot.empty) {
      console.log(`   ✅ Found ${jobsSnapshot.size} recent SIGA jobs`);
      
      jobsSnapshot.forEach((doc, index) => {
        const jobData = doc.data();
        const createdDate = jobData.createdAt ? new Date(jobData.createdAt._seconds * 1000).toLocaleDateString() : 'N/A';
        console.log(`   ${index + 1}. ${jobData.title || 'Untitled Job'}`);
        console.log(`      Created: ${createdDate}`);
        console.log(`      Status: ${jobData.status || 'N/A'}`);
        console.log(`      Source: ${jobData.source || jobData.importSource || 'Direct'}`);
      });
    } else {
      console.log('   ⚠️  No recent jobs found for SIGA');
    }
    
    // 4. Check for any RSS-related system logs
    console.log('\n📋 4. CHECKING SYSTEM LOGS FOR RSS ACTIVITY...');
    const logsSnapshot = await db.collection('system_logs')
      .where('type', '==', 'rss_feed')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();
    
    if (!logsSnapshot.empty) {
      console.log(`   ✅ Found ${logsSnapshot.size} recent RSS system logs`);
      
      logsSnapshot.forEach((doc, index) => {
        const logData = doc.data();
        const timestamp = logData.timestamp ? new Date(logData.timestamp._seconds * 1000).toLocaleString() : 'N/A';
        console.log(`   ${index + 1}. ${timestamp}: ${logData.message || 'No message'}`);
      });
    } else {
      console.log('   ℹ️  No RSS system logs found');
    }
    
    console.log('\n🔍 SIGA RSS FEED CHECK COMPLETED!');
    
    // Summary and recommendations
    console.log('\n📋 SUMMARY & RECOMMENDATIONS:');
    console.log('=' .repeat(50));
    
    if (rssSnapshot.empty && jobsSnapshot.empty) {
      console.log('⚠️  POTENTIAL ISSUE: No RSS feeds or recent jobs found for SIGA');
      console.log('   → Check if RSS feed integration needs to be restored');
      console.log('   → Verify SIGA website job feed is still available');
    } else if (rssSnapshot.empty && !jobsSnapshot.empty) {
      console.log('ℹ️  JOBS FOUND: SIGA has jobs but no RSS feed config');
      console.log('   → Jobs might be manually posted or from different integration');
    } else if (!rssSnapshot.empty && jobsSnapshot.empty) {
      console.log('⚠️  FEED CONFIGURED BUT NO JOBS: RSS feed exists but no recent jobs');
      console.log('   → Check if RSS feed is actively pulling jobs');
      console.log('   → Verify RSS feed URL is still valid');
    } else {
      console.log('✅ LOOKS GOOD: Both RSS feed config and jobs found');
      console.log('   → RSS integration appears to be working');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error checking SIGA RSS feed:', error.message);
    process.exit(1);
  }
}

checkSIGARSSFeed();