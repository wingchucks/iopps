const admin = require('firebase-admin');
const https = require('https');

async function checkSIGAOracleRSS() {
  try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    const db = admin.firestore();
    console.log('🔍 CHECKING SIGA ORACLE HCM RSS FEED...');
    console.log('=' .repeat(60));
    
    const sigaId = 'sR78eEVUvvVaOFLGcUudlD0s0gq1';
    const oracleBaseUrl = 'https://iaayzv.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/SIGA';
    
    console.log(`📋 SIGA Firebase ID: ${sigaId}`);
    console.log(`🏢 Oracle HCM Base URL: ${oracleBaseUrl}`);
    
    // 1. Check current SIGA RSS configuration in database
    console.log('\n📡 1. CURRENT RSS FEED CONFIGURATION...');
    const rssSnapshot = await db.collection('rssFeeds').where('employerId', '==', sigaId).get();
    
    if (!rssSnapshot.empty) {
      console.log(`   ✅ Found ${rssSnapshot.size} RSS feed configuration(s)`);
      rssSnapshot.forEach(doc => {
        const rssData = doc.data();
        console.log(`   📡 RSS Feed ID: ${doc.id}`);
        console.log(`   📡 Configured URL: ${rssData.feedUrl || 'N/A'}`);
        console.log(`   📡 Status: ${rssData.status || 'Unknown'}`);
        console.log(`   📡 Active: ${rssData.isActive !== false ? 'Yes' : 'No'}`);
        console.log(`   📡 Last Updated: ${rssData.lastUpdated ? new Date(rssData.lastUpdated._seconds * 1000).toLocaleString() : 'Never'}`);
        console.log(`   📡 Last Success: ${rssData.lastSuccessfulFetch ? new Date(rssData.lastSuccessfulFetch._seconds * 1000).toLocaleString() : 'Never'}`);
      });
    } else {
      console.log('   ⚠️  No RSS feed configuration found for SIGA');
    }
    
    // 2. Test common Oracle HCM RSS endpoints
    console.log('\n🌐 2. TESTING ORACLE HCM RSS ENDPOINTS...');
    
    const possibleRSSUrls = [
      `${oracleBaseUrl}/jobs.rss`,
      `${oracleBaseUrl}/feed`,
      `${oracleBaseUrl}/rss`,
      `${oracleBaseUrl}/jobs/rss`,
      `${oracleBaseUrl}?format=rss`,
      'https://iaayzv.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/SIGA/jobs.rss'
    ];
    
    for (const url of possibleRSSUrls) {
      console.log(`   🔍 Testing: ${url}`);
      try {
        const result = await testRSSEndpoint(url);
        if (result.isRSS) {
          console.log(`   ✅ VALID RSS FEED FOUND!`);
          console.log(`   📊 Status: ${result.status}`);
          console.log(`   📊 Content Type: ${result.contentType}`);
          console.log(`   📊 Content Length: ${result.contentLength || 'Unknown'}`);
          console.log(`   📊 Contains Job Data: ${result.hasJobContent ? 'Yes' : 'Unknown'}`);
          
          // If we found a working RSS feed, compare with database config
          if (!rssSnapshot.empty) {
            const currentUrl = rssSnapshot.docs[0].data().feedUrl;
            if (currentUrl !== url) {
              console.log(`   ⚠️  URL MISMATCH!`);
              console.log(`   📡 Database: ${currentUrl}`);
              console.log(`   🌐 Working: ${url}`);
            } else {
              console.log(`   ✅ URL matches database configuration`);
            }
          }
          break;
        } else {
          console.log(`   ❌ ${result.status} - ${result.error || 'Not RSS'}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    // 3. Check recent SIGA jobs and their source
    console.log('\n💼 3. RECENT SIGA JOBS ANALYSIS...');
    const jobsSnapshot = await db.collection('jobs')
      .where('employerId', '==', sigaId)
      .orderBy('createdAt', 'desc')
      .limit(15)
      .get();
    
    if (!jobsSnapshot.empty) {
      console.log(`   ✅ Found ${jobsSnapshot.size} recent SIGA jobs`);
      
      let rssJobs = 0;
      let manualJobs = 0;
      let recentRSSJob = null;
      
      jobsSnapshot.forEach(doc => {
        const jobData = doc.data();
        const source = jobData.source || jobData.importSource || 'direct';
        
        if (source.toLowerCase().includes('rss') || source.toLowerCase().includes('feed')) {
          rssJobs++;
          if (!recentRSSJob) {
            recentRSSJob = {
              title: jobData.title,
              created: jobData.createdAt ? new Date(jobData.createdAt._seconds * 1000).toLocaleString() : 'Unknown',
              source: source
            };
          }
        } else {
          manualJobs++;
        }
      });
      
      console.log(`   📊 RSS/Feed Jobs: ${rssJobs}`);
      console.log(`   📊 Manual/Other Jobs: ${manualJobs}`);
      
      if (recentRSSJob) {
        console.log(`   📋 Most Recent RSS Job: "${recentRSSJob.title}"`);
        console.log(`   📋 Created: ${recentRSSJob.created}`);
        console.log(`   📋 Source: ${recentRSSJob.source}`);
      }
      
    } else {
      console.log('   ⚠️  No recent jobs found for SIGA');
    }
    
    // 4. Recommendations
    console.log('\n📋 RECOMMENDATIONS:');
    console.log('=' .repeat(60));
    
    if (rssSnapshot.empty) {
      console.log('🚨 SETUP NEEDED: No RSS feed configured for SIGA');
      console.log('   → Set up RSS feed from Oracle HCM site');
      console.log('   → Use working RSS URL found above');
    } else {
      const rssData = rssSnapshot.docs[0].data();
      const lastUpdate = rssData.lastSuccessfulFetch ? new Date(rssData.lastSuccessfulFetch._seconds * 1000) : null;
      const daysSinceUpdate = lastUpdate ? Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)) : null;
      
      if (!lastUpdate) {
        console.log('⚠️  RSS feed configured but never successful');
        console.log('   → Check RSS feed URL and credentials');
      } else if (daysSinceUpdate > 7) {
        console.log(`⚠️  RSS feed last successful ${daysSinceUpdate} days ago`);
        console.log('   → RSS feed may have stopped working');
        console.log('   → Verify Oracle HCM RSS endpoint is still valid');
      } else {
        console.log('✅ RSS feed appears to be working recently');
      }
    }
    
    console.log('\n🎯 Oracle HCM Base URL for reference:');
    console.log(`   ${oracleBaseUrl}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function testRSSEndpoint(url) {
  return new Promise((resolve) => {
    const options = {
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'IOPPS RSS Feed Checker 1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
        // Stop collecting data after 2KB to avoid memory issues
        if (data.length > 2048) {
          res.destroy();
        }
      });
      
      res.on('end', () => {
        const result = {
          status: res.statusCode,
          contentType: res.headers['content-type'] || 'unknown',
          contentLength: res.headers['content-length'],
          isRSS: false,
          hasJobContent: false,
          error: null
        };
        
        if (res.statusCode === 200) {
          const contentType = res.headers['content-type'] || '';
          const isXML = contentType.includes('xml') || data.trim().startsWith('<?xml');
          const isRSS = isXML && (data.includes('<rss') || data.includes('<feed') || data.includes('</rss>') || data.includes('</feed>'));
          const hasJobs = data.toLowerCase().includes('job') || data.toLowerCase().includes('career') || data.toLowerCase().includes('position');
          
          result.isRSS = isRSS;
          result.hasJobContent = hasJobs;
        } else {
          result.error = `HTTP ${res.statusCode}`;
        }
        
        resolve(result);
      });
    });
    
    req.on('error', (error) => {
      resolve({
        status: 0,
        contentType: 'error',
        isRSS: false,
        hasJobContent: false,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 0,
        contentType: 'timeout',
        isRSS: false,
        hasJobContent: false,
        error: 'Request timeout'
      });
    });
    
    req.end();
  });
}

checkSIGAOracleRSS();