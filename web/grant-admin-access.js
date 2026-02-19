const admin = require('firebase-admin');

async function grantAdminAccess() {
  try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    const db = admin.firestore();
    console.log('👑 GRANTING SUPER ADMIN ACCESS TO NATHAN...');
    console.log('=' .repeat(60));
    
    const nathanEmail = 'nathan.arias@iopps.ca';
    const timestamp = admin.firestore.Timestamp.now();
    
    // 1. Find Nathan's user account
    console.log(`🔍 Looking for user account: ${nathanEmail}`);
    const usersSnapshot = await db.collection('users').where('email', '==', nathanEmail).get();
    
    let nathanUserId = null;
    
    if (!usersSnapshot.empty) {
      // Update existing user account
      nathanUserId = usersSnapshot.docs[0].id;
      console.log(`✅ Found existing user account: ${nathanUserId}`);
      
      const adminUpdate = {
        role: 'super_admin',
        isAdmin: true,
        isSuperAdmin: true,
        adminGrantedAt: timestamp,
        adminLevel: 'super_admin',
        permissions: {
          manageUsers: true,
          manageEmployers: true,
          manageJobs: true,
          managePremiumPartners: true,
          manageSystem: true,
          viewAnalytics: true,
          moderateContent: true
        },
        updatedAt: timestamp
      };
      
      await db.collection('users').doc(nathanUserId).update(adminUpdate);
      console.log('🚀 Updated user with super admin privileges');
      
    } else {
      // Create new user account for Nathan
      console.log('⚠️  User account not found, creating new admin account...');
      
      nathanUserId = 'nathan_admin_' + Date.now();
      const newUserData = {
        email: nathanEmail,
        displayName: 'Nathan Arias',
        role: 'super_admin',
        isAdmin: true,
        isSuperAdmin: true,
        adminGrantedAt: timestamp,
        adminLevel: 'super_admin',
        permissions: {
          manageUsers: true,
          manageEmployers: true,
          manageJobs: true,
          managePremiumPartners: true,
          manageSystem: true,
          viewAnalytics: true,
          moderateContent: true
        },
        createdAt: timestamp,
        updatedAt: timestamp,
        emailVerified: true
      };
      
      await db.collection('users').doc(nathanUserId).set(newUserData);
      console.log('🚀 Created new super admin account');
    }
    
    // 2. Create admin settings document
    console.log('\n⚙️  Setting up admin configuration...');
    
    const adminSettings = {
      superAdmins: [nathanEmail],
      adminEmails: [nathanEmail],
      requireApproval: {
        employers: true,
        jobs: false,
        premiumUpgrades: false
      },
      autoApprove: {
        verifiedDomains: ['iopps.ca'],
        trustedSources: ['rss_feeds']
      },
      notifications: {
        newEmployerSignup: true,
        premiumPartnerActivity: true,
        systemAlerts: true,
        emailNotifications: nathanEmail
      },
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    await db.collection('settings').doc('admin_config').set(adminSettings);
    console.log('✅ Admin configuration saved');
    
    // 3. Create admin dashboard stats cache
    console.log('\n📊 Setting up dashboard stats...');
    
    const employersSnapshot = await db.collection('employers').get();
    const jobsSnapshot = await db.collection('jobs').get();
    const membersSnapshot = await db.collection('users').get();
    const pendingSnapshot = await db.collection('employers').where('status', '==', 'pending').get();
    const premiumSnapshot = await db.collection('employers').where('isPremiumPartner', '==', true).get();
    
    const dashboardStats = {
      totalEmployers: employersSnapshot.size,
      totalJobs: jobsSnapshot.size,
      totalMembers: membersSnapshot.size,
      pendingApprovals: pendingSnapshot.size,
      premiumPartners: premiumSnapshot.size,
      lastUpdated: timestamp
    };
    
    await db.collection('admin_cache').doc('dashboard_stats').set(dashboardStats);
    console.log('✅ Dashboard stats cached');
    
    // 4. Log the admin access grant
    console.log('\n📝 Logging admin access grant...');
    
    const auditLog = {
      action: 'grant_super_admin_access',
      targetUser: nathanEmail,
      targetUserId: nathanUserId,
      grantedBy: 'system_migration',
      grantedAt: timestamp,
      permissions: adminUpdate ? adminUpdate.permissions : newUserData.permissions,
      notes: 'Super admin access granted during platform setup'
    };
    
    await db.collection('audit_logs').add(auditLog);
    console.log('✅ Audit log created');
    
    console.log('\n🎉 SUPER ADMIN ACCESS GRANTED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    console.log(`👤 User: ${nathanEmail}`);
    console.log(`🆔 User ID: ${nathanUserId}`);
    console.log(`👑 Role: Super Admin`);
    console.log(`🔑 Permissions: All admin permissions granted`);
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Create admin dashboard UI pages');
    console.log('2. Add admin navigation menu');
    console.log('3. Test admin access after login');
    console.log('4. Set up admin approval workflows');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error granting admin access:', error.message);
    process.exit(1);
  }
}

grantAdminAccess();