/**
 * FIX NATHAN'S ADMIN ACCESS
 * 
 * The admin dashboard ALREADY EXISTS and is well-built.
 * The ONLY problem: Nathan's user document has role="community" or "employer"
 * instead of role="admin", so the auth guard kicks him back to /.
 * 
 * This script does TWO things:
 * 1. Updates Nathan's Firestore user doc: role → "admin"
 * 2. Sets Firebase Auth custom claim: admin → true
 *    (so API routes like /api/admin/employers also authorize him)
 */

const admin = require('firebase-admin');

async function fixNathanAdmin() {
  const serviceAccount = require('./firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  const db = admin.firestore();
  const auth = admin.auth();

  const NATHAN_EMAIL = 'nathan.arias@iopps.ca';

  console.log('🔧 Fixing admin access for:', NATHAN_EMAIL);
  console.log('');

  // -----------------------------------------------------------------------
  // Step 1: Find Nathan's Firebase Auth UID
  // -----------------------------------------------------------------------
  let uid;
  try {
    const userRecord = await auth.getUserByEmail(NATHAN_EMAIL);
    uid = userRecord.uid;
    console.log('✅ Found Firebase Auth user:', uid);
    console.log('   Display name:', userRecord.displayName || '(not set)');
    console.log('   Email verified:', userRecord.emailVerified);
  } catch (err) {
    console.error('❌ Could not find Firebase Auth user for', NATHAN_EMAIL);
    console.error('   Nathan needs to sign up / log in first, then re-run this script.');
    process.exit(1);
  }

  // -----------------------------------------------------------------------
  // Step 2: Update Firestore user document → role: "admin"
  // -----------------------------------------------------------------------
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();

  if (userSnap.exists) {
    const current = userSnap.data();
    console.log('');
    console.log('📄 Current Firestore user doc:');
    console.log('   role:', current.role);
    console.log('   email:', current.email);
    console.log('   displayName:', current.displayName);

    await userRef.update({
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('');
    console.log('✅ Firestore role updated: "' + current.role + '" → "admin"');
  } else {
    console.log('⚠️  No Firestore user doc found. Creating one...');
    await userRef.set({
      id: uid,
      email: NATHAN_EMAIL,
      displayName: 'Nathan Arias',
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Created Firestore user doc with role: "admin"');
  }

  // -----------------------------------------------------------------------
  // Step 3: Set Firebase Auth custom claims → { admin: true, role: "admin" }
  // -----------------------------------------------------------------------
  console.log('');
  console.log('🔑 Setting Firebase Auth custom claims...');

  await auth.setCustomUserClaims(uid, {
    admin: true,
    role: 'admin',
  });

  console.log('✅ Custom claims set: { admin: true, role: "admin" }');

  // -----------------------------------------------------------------------
  // Step 4: Verify everything
  // -----------------------------------------------------------------------
  console.log('');
  console.log('🔍 Verifying...');

  const updatedDoc = await userRef.get();
  const updatedAuth = await auth.getUser(uid);

  console.log('   Firestore role:', updatedDoc.data()?.role);
  console.log('   Auth custom claims:', JSON.stringify(updatedAuth.customClaims));

  // -----------------------------------------------------------------------
  // Done
  // -----------------------------------------------------------------------
  console.log('');
  console.log('═'.repeat(60));
  console.log('🎉 DONE! Nathan now has full admin access.');
  console.log('');
  console.log('⚠️  IMPORTANT: Nathan must LOG OUT and LOG BACK IN');
  console.log('   for the custom claims to take effect on his auth token.');
  console.log('');
  console.log('Then visit: https://iopps.ca/admin');
  console.log('═'.repeat(60));

  process.exit(0);
}

fixNathanAdmin().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
