/**
 * Security Rule Verification Script
 * 
 * Run with: npx ts-node scripts/verify-rules.ts or npx tsx scripts/verify-rules.ts
 * 
 * Validation logic for Firestore and Storage rules.
 */

import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ref, uploadBytes } from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PROJECT_ID = 'iopps-test-project';
const STORAGE_BUCKET = 'iopps-test-project.appspot.com';

async function runTests() {
    console.log('🔒 Starting Security Rule Verification...');

    let testEnv: RulesTestEnvironment;

    try {
        // Read rules
        const firestoreRules = readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8');
        const storageRules = readFileSync(resolve(__dirname, '../../storage.rules'), 'utf8');

        testEnv = await initializeTestEnvironment({
            projectId: PROJECT_ID,
            firestore: {
                rules: firestoreRules,
                host: '127.0.0.1',
                port: 8080,
            },
            storage: {
                rules: storageRules,
                host: '127.0.0.1',
                port: 9199,
            },
        });

        console.log('✅ Test Environment Initialized');

        await testEnv.clearFirestore();
        await testEnv.clearStorage();

        // =========================================================================
        // SEED DATA
        // =========================================================================
        // We must seed user profiles because rules rely on `getUserData()` to check roles.
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await setDoc(doc(db, 'users', 'emp1'), { role: 'employer' });
            await setDoc(doc(db, 'users', 'alice'), { role: 'member' });
            await setDoc(doc(db, 'users', 'bob'), { role: 'member' });
            await setDoc(doc(db, 'users', 'vendor1'), { role: 'vendor' });
            await setDoc(doc(db, 'users', 'vendor2'), { role: 'vendor' });
        });
        console.log('✅ Mock data seeded');

        // =========================================================================
        // HELPER CONTEXTS
        // =========================================================================

        // Unauthenticated User
        const unauthedDb = testEnv.unauthenticatedContext().firestore();
        const unauthedStorage = testEnv.unauthenticatedContext().storage();

        // Authenticated User "Alice" (Member)
        const aliceDb = testEnv.authenticatedContext('alice', { role: 'member' }).firestore();
        const aliceStorage = testEnv.authenticatedContext('alice').storage();

        // Authenticated User "Bob" (Attacker/Other Member)
        const bobDb = testEnv.authenticatedContext('bob', { role: 'member' }).firestore();
        const bobStorage = testEnv.authenticatedContext('bob').storage();

        // Authenticated User "EmpCorp" (Employer)
        const empDb = testEnv.authenticatedContext('emp1', { role: 'employer' }).firestore();

        // Vendor
        const vendorStorage = testEnv.authenticatedContext('vendor1').storage();
        const vendor2Storage = testEnv.authenticatedContext('vendor2').storage();

        // =========================================================================
        // TEST SUITE: FIRESTORE
        // =========================================================================
        console.log('\n🧪 Testing Firestore Rules...');

        // 1. Public Read Access
        await assertSucceeds(getDoc(doc(unauthedDb, 'jobs', 'job1')));
        console.log('  ✅ [PASS] Public can read jobs');

        // 2. User Profile Protection
        // Alice requests to update her own profile - this tests the rules
        await assertSucceeds(setDoc(doc(aliceDb, 'users', 'alice'), { name: 'Alice', role: 'member' }, { merge: true }));
        console.log('  ✅ [PASS] User can write own profile');

        // Bob cannot write Alice's profile
        await assertFails(setDoc(doc(bobDb, 'users', 'alice'), { name: 'Hacked', role: 'admin' }));
        console.log('  ✅ [PASS] User cannot write others\' profile');

        // 3. Employer specific
        // Employer can create a job
        await assertSucceeds(setDoc(doc(empDb, 'jobs', 'job_new'), { employerId: 'emp1', title: 'Dev' }));
        console.log('  ✅ [PASS] Employer can create job');

        // Member (Alice) cannot create a job
        await assertFails(setDoc(doc(aliceDb, 'jobs', 'job_fail'), { employerId: 'alice', title: 'Fake Job' }));
        console.log('  ✅ [PASS] Member cannot create job');

        // =========================================================================
        // TEST SUITE: STORAGE
        // =========================================================================
        console.log('\n🧪 Testing Storage Rules...');

        const validImage = new Uint8Array([0x89, 0x50, 0x4E, 0x47]); // Fake PNG header
        const validPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]); // %PDF-

        // 1. Profile Pictures
        // Alice uploads her profile pic
        await assertSucceeds(uploadBytes(ref(aliceStorage, 'users/alice/profile/me.jpg'), validImage, { contentType: 'image/jpeg' }));
        console.log('  ✅ [PASS] User can upload own profile picture');

        // Bob tries to overwrite Alice's pic
        await assertFails(uploadBytes(ref(bobStorage, 'users/alice/profile/me.jpg'), validImage, { contentType: 'image/jpeg' }));
        console.log('  ✅ [PASS] User cannot overwrite others\' profile picture');

        // 2. Resumes
        // Alice uploads her resume
        await assertSucceeds(uploadBytes(ref(aliceStorage, 'users/alice/resumes/cv.pdf'), validPdf, { contentType: 'application/pdf' }));
        console.log('  ✅ [PASS] User can upload own resume');

        // 3. Vendor Images
        // Vendor uploads to their folder
        await assertSucceeds(uploadBytes(ref(vendorStorage, 'vendors/cover/vendor1/banner.jpg'), validImage, { contentType: 'image/jpeg' }));
        console.log('  ✅ [PASS] Vendor can upload own cover image');

        // Test: vendor2 cannot upload to vendor1's folder
        await assertFails(uploadBytes(ref(vendor2Storage, 'vendors/cover/vendor1/banner.jpg'), validImage, { contentType: 'image/jpeg' }));
        console.log('  ✅ [PASS] Vendor cannot upload to another vendor\'s folder (vendor2 -> vendor1)');


        console.log('\n🎉 ALL SECURITY CHECKS PASSED!');

    } catch (e: unknown) {
        console.error('\n❌ TEST FAILED:', e);
        if (e instanceof Error && e.stack) {
            console.error(e.stack);
        }
        process.exit(1);
    } finally {
        if (testEnv!) await testEnv.cleanup();
    }
}

runTests();
