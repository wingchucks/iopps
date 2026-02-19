/**
 * Check SIGA's RSS feed configuration in the rssFeeds collection.
 * The sync-feeds cron route already handles RSS → job import.
 */

const admin = require('firebase-admin');

async function checkSigaFeed() {
  const serviceAccount = require('./firebase-service-account.json');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const SIGA_ID = 'sR78eEVUvvVaOFLGcUudlD0s0gq1';

  console.log('🔍 Checking SIGA RSS feed config...\n');

  // Check rssFeeds collection
  const allFeeds = await db.collection('rssFeeds').get();
  console.log(`Total RSS feeds in database: ${allFeeds.size}`);

  if (allFeeds.empty) {
    console.log('\n⚠️  No RSS feeds configured at all.');
    console.log('   SIGA needs a feed entry in the rssFeeds collection.');
    console.log('   The cron route /api/cron/sync-feeds will then auto-import jobs.');
  } else {
    allFeeds.forEach(doc => {
      const d = doc.data();
      const isSiga = d.employerId === SIGA_ID;
      console.log(`\n${isSiga ? '👑' : '📡'} Feed: ${doc.id}`);
      console.log(`   Name: ${d.feedName || '(unnamed)'}`);
      console.log(`   URL: ${d.feedUrl || '(none)'}`);
      console.log(`   Employer ID: ${d.employerId}`);
      console.log(`   Active: ${d.active}`);
      console.log(`   Frequency: ${d.syncFrequency || 'manual'}`);
      console.log(`   Last synced: ${d.lastSyncedAt ? d.lastSyncedAt.toDate?.() || d.lastSyncedAt : 'never'}`);
      console.log(`   Total imported: ${d.totalJobsImported || 0}`);
    });
  }

  // Check SIGA jobs
  const sigaJobs = await db.collection('jobs')
    .where('employerId', '==', SIGA_ID)
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  console.log(`\n💼 Recent SIGA jobs: ${sigaJobs.size}`);
  sigaJobs.forEach(doc => {
    const j = doc.data();
    console.log(`   • ${j.title} (source: ${j.source || 'direct'}, created: ${j.createdAt?.toDate?.()?.toLocaleDateString() || 'unknown'})`);
  });

  process.exit(0);
}

checkSigaFeed().catch(err => { console.error('❌', err.message); process.exit(1); });
