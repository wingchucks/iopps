const admin = require('firebase-admin');

(async function executeMigration() {
  try {
    console.log('🚀 EXECUTING PREMIUM PARTNER MIGRATION...');
    
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    const db = admin.firestore();
    const timestamp = admin.firestore.Timestamp.now();
    
    // Premium Partners to migrate
    const partners = [
      {
        id: 'sR78eEVUvvVaOFLGcUudlD0s0gq1',
        name: 'Saskatchewan Indian Gaming Authority'
      },
      {
        id: 'UyTZcF7xEiRmBnSEzcSMmw9MXvL2', 
        name: 'Westland Insurance'
      },
      {
        id: 'tsRvNLiRWARbOoiBOiEVFDwFfZn2',
        name: 'Saskatoon Tribal Council'
      }
    ];
    
    console.log(`📊 Migrating ${partners.length} Premium Partners...`);
    
    for (const partner of partners) {
      console.log(`\n📋 Processing: ${partner.name}`);
      console.log(`   ID: ${partner.id}`);
      
      const updateData = {
        subscriptionTier: 'premium_partner',
        subscriptionStatus: 'active',
        isPremiumPartner: true,
        premiumPartnerSince: timestamp,
        premiumPartnerMigratedAt: timestamp,
        featuresEnabled: {
          unlimitedJobs: true,
          featuredJobs: true,
          talentSearch: true,
          analytics: true,
          prioritySupport: true,
          customBranding: true
        },
        jobPostingLimits: {
          standard: -1,
          featured: -1,
          maxSimultaneousFeatured: 10
        },
        updatedAt: timestamp,
        lastModifiedBy: 'premium_migration_script'
      };
      
      await db.collection('employers').doc(partner.id).update(updateData);
      console.log('   🎉 UPGRADED TO PREMIUM PARTNER!');
    }
    
    console.log('\n🎊 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('✅ All 3 Premium Partners have been upgraded');
    console.log('✅ Unlimited job posting access granted');
    console.log('✅ All premium features enabled');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
})();