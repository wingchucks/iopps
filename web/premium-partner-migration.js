const admin = require('firebase-admin');
const fs = require('fs');

// Premium Partners identified from search
const PREMIUM_PARTNERS = {
  'Saskatchewan Indian Gaming Authority': {
    id: 'sR78eEVUvvVaOFLGcUudlD0s0gq1',
    organizationName: 'Saskatchewan Indian Gaming Authority',
    currentStatus: 'approved',
    verified: true,
    approvedDate: '2025-12-11'
  },
  'Westland Insurance': {
    id: 'UyTZcF7xEiRmBnSEzcSMmw9MXvL2', 
    organizationName: 'Westland Insurance',
    currentStatus: 'approved',
    verified: true,
    approvedDate: '2026-01-06'
  },
  'Saskatoon Tribal Council': {
    // NOTE: Two accounts found - using newer one by default
    id: 'tsRvNLiRWARbOoiBOiEVFDwFfZn2',
    organizationName: 'Saskatoon Tribal Council',
    currentStatus: 'approved',
    verified: true,
    approvedDate: '2025-12-18',
    duplicateAccount: 'jNQB1XrW8DfwmN6hABeyym7br4y1' // Saskatoon Tribal Council Inc
  }
};

async function migrateToPremiumPartners() {
  let results = [];
  
  try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    const db = admin.firestore();
    results.push('🚀 Starting Premium Partner Migration...\n');
    results.push('=' .repeat(60) + '\n');
    
    // Migration timestamp
    const migrationTimestamp = admin.firestore.Timestamp.now();
    
    for (const [name, partner] of Object.entries(PREMIUM_PARTNERS)) {
      results.push(`\n📋 Processing: ${name}\n`);
      results.push(`   Firebase ID: ${partner.id}\n`);
      
      // Get current employer data
      const employerDoc = await db.collection('employers').doc(partner.id).get();
      
      if (!employerDoc.exists) {
        results.push(`   ❌ ERROR: Employer document not found!\n`);
        continue;
      }
      
      const currentData = employerDoc.data();
      results.push(`   ✅ Current Status: ${currentData.status}\n`);
      results.push(`   ✅ Verified: ${currentData.verified}\n`);
      
      // Premium Partner upgrade data
      const premiumUpgrade = {
        // Subscription tier
        subscriptionTier: 'premium_partner',
        subscriptionStatus: 'active',
        
        // Premium Partner specific fields
        isPremiumPartner: true,
        premiumPartnerSince: migrationTimestamp,
        premiumPartnerMigratedAt: migrationTimestamp,
        
        // Premium features
        featuresEnabled: {
          unlimitedJobs: true,
          featuredJobs: true,
          talentSearch: true,
          analytics: true,
          prioritySupport: true,
          customBranding: true
        },
        
        // Job posting limits (unlimited for Premium Partners)
        jobPostingLimits: {
          standard: -1,  // -1 = unlimited
          featured: -1,  // -1 = unlimited
          maxSimultaneousFeatured: 10
        },
        
        // Maintain existing approval status
        updatedAt: migrationTimestamp,
        lastModifiedBy: 'premium_migration_script',
        migrationNotes: `Migrated to Premium Partner status on ${new Date().toISOString()}`
      };
      
      // Update the employer document
      await db.collection('employers').doc(partner.id).update(premiumUpgrade);
      
      results.push(`   🎉 UPGRADED TO PREMIUM PARTNER!\n`);
      results.push(`   ✅ Subscription Tier: premium_partner\n`);
      results.push(`   ✅ Features Enabled: All Premium Features\n`);
      results.push(`   ✅ Job Posting Limits: Unlimited\n`);
    }
    
    results.push(`\n🎊 PREMIUM PARTNER MIGRATION COMPLETED!\n`);
    results.push('=' .repeat(60) + '\n');
    results.push(`✅ Total Premium Partners Migrated: ${Object.keys(PREMIUM_PARTNERS).length}\n`);
    results.push(`📅 Migration Date: ${new Date().toISOString()}\n`);
    
    // Handle Saskatoon Tribal Council duplicate
    results.push(`\n⚠️  NOTE: Saskatoon Tribal Council Duplicate Account\n`);
    results.push(`   Primary: tsRvNLiRWARbOoiBOiEVFDwFfZn2 (MIGRATED)\n`);
    results.push(`   Duplicate: jNQB1XrW8DfwmN6hABeyym7br4y1 (REQUIRES REVIEW)\n`);
    
    // Write results to file
    fs.writeFileSync('premium-migration-results.txt', results.join(''));
    console.log(results.join(''));
    process.exit(0);
    
  } catch (error) {
    results.push(`❌ MIGRATION ERROR: ${error.message}\n`);
    fs.writeFileSync('premium-migration-results.txt', results.join(''));
    console.error(results.join(''));
    process.exit(1);
  }
}

// Dry run function to preview changes without applying them
async function previewMigration() {
  console.log('🔍 PREMIUM PARTNER MIGRATION PREVIEW');
  console.log('=' .repeat(50));
  
  for (const [name, partner] of Object.entries(PREMIUM_PARTNERS)) {
    console.log(`\n📋 ${name}`);
    console.log(`   Firebase ID: ${partner.id}`);
    console.log(`   Current Status: ${partner.currentStatus}`);
    console.log(`   → Will become: Premium Partner`);
    console.log(`   → Features: All Premium Features Enabled`);
    console.log(`   → Job Limits: Unlimited`);
  }
  
  console.log('\n⚠️  Saskatoon Tribal Council has duplicate accounts');
  console.log('   Review required after migration');
  
  console.log('\n🚀 Run migrateToPremiumPartners() to execute migration');
}

// Export functions
module.exports = { migrateToPremiumPartners, previewMigration, PREMIUM_PARTNERS };

// Run preview by default
if (require.main === module) {
  previewMigration();
}