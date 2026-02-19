const admin = require('firebase-admin');

async function checkAdminAccess() {
  try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    const db = admin.firestore();
    console.log('🔍 CHECKING ADMIN ACCESS FOR NATHAN...');
    console.log('=' .repeat(60));
    
    const nathanEmail = 'nathan.arias@iopps.ca';
    console.log(`👤 Checking admin access for: ${nathanEmail}`);
    
    // 1. Check if Nathan's user account exists and has admin privileges
    console.log('\n1️⃣ CHECKING USER ACCOUNT...');
    const usersSnapshot = await db.collection('users').where('email', '==', nathanEmail).get();
    
    if (!usersSnapshot.empty) {
      console.log('   ✅ User account found');
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        console.log(`   👤 User ID: ${doc.id}`);
        console.log(`   📧 Email: ${userData.email}`);
        console.log(`   🏷️  Display Name: ${userData.displayName || 'N/A'}`);
        console.log(`   🔑 Role: ${userData.role || 'Not set'}`);
        console.log(`   👑 Is Admin: ${userData.isAdmin === true ? 'YES' : 'NO'}`);
        console.log(`   👑 Is Super Admin: ${userData.isSuperAdmin === true ? 'YES' : 'NO'}`);
        console.log(`   ✅ Email Verified: ${userData.emailVerified === true ? 'YES' : 'NO'}`);
        
        if (!userData.isAdmin && !userData.isSuperAdmin) {
          console.log('\n   🚨 ISSUE FOUND: Nathan does not have admin privileges!');
        }
      });
    } else {
      console.log('   ❌ User account not found!');
      console.log('   🚨 This is a critical issue - Nathan needs a user account');
    }
    
    // 2. Check for any existing admin-related collections or settings
    console.log('\n2️⃣ CHECKING ADMIN CONFIGURATION...');
    
    try {
      const adminSettingsSnapshot = await db.collection('settings').where('type', '==', 'admin').get();
      if (!adminSettingsSnapshot.empty) {
        console.log('   ✅ Admin settings found');
        adminSettingsSnapshot.forEach(doc => {
          const settingsData = doc.data();
          console.log(`   ⚙️  Setting: ${doc.id}`);
          console.log(`   📋 Data: ${JSON.stringify(settingsData, null, 2)}`);
        });
      } else {
        console.log('   ⚠️  No admin settings found');
      }
    } catch (error) {
      console.log('   ⚠️  Admin settings collection may not exist');
    }
    
    // 3. Check system stats that admin would need to see
    console.log('\n3️⃣ GATHERING SYSTEM STATS FOR ADMIN DASHBOARD...');
    
    // Get counts for admin dashboard
    const employersSnapshot = await db.collection('employers').get();
    const jobsSnapshot = await db.collection('jobs').get();
    const membersSnapshot = await db.collection('users').get();
    
    console.log(`   📊 Total Employers: ${employersSnapshot.size}`);
    console.log(`   📊 Total Jobs: ${jobsSnapshot.size}`);
    console.log(`   📊 Total Members: ${membersSnapshot.size}`);
    
    // Check pending approvals
    const pendingEmployersSnapshot = await db.collection('employers').where('status', '==', 'pending').get();
    console.log(`   ⏳ Pending Employer Approvals: ${pendingEmployersSnapshot.size}`);
    
    if (pendingEmployersSnapshot.size > 0) {
      console.log('   📋 Pending Employers:');
      pendingEmployersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`      • ${data.organizationName || 'Unknown'} (${doc.id})`);
      });
    }
    
    // 4. Check Premium Partners
    console.log('\n4️⃣ PREMIUM PARTNERS STATUS...');
    const premiumPartnersSnapshot = await db.collection('employers').where('isPremiumPartner', '==', true).get();
    console.log(`   👑 Premium Partners: ${premiumPartnersSnapshot.size}`);
    
    if (premiumPartnersSnapshot.size > 0) {
      console.log('   📋 Premium Partners:');
      premiumPartnersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`      • ${data.organizationName || 'Unknown'} (${doc.id})`);
      });
    }
    
    console.log('\n🔧 RECOMMENDATIONS:');
    console.log('=' .repeat(60));
    
    if (usersSnapshot.empty) {
      console.log('🚨 CRITICAL: Create Nathan\'s admin user account');
      console.log('🚨 CRITICAL: Set up admin privileges');
      console.log('🚨 CRITICAL: Create admin dashboard pages');
    } else {
      const userData = usersSnapshot.docs[0].data();
      if (!userData.isAdmin && !userData.isSuperAdmin) {
        console.log('🚨 URGENT: Grant Nathan admin privileges');
      }
      console.log('📝 TODO: Create admin dashboard UI');
      console.log('📝 TODO: Add admin navigation menu');
      console.log('📝 TODO: Create admin approval workflows');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAdminAccess();