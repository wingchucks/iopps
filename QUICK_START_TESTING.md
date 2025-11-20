# Quick Start Testing Guide

## Current Environment Status

Based on the logs:
- ❌ Firebase Emulators: Require Java (not installed)
- ⚠️  Next.js Dev Server: Port conflicts detected
- ✅ Production Firebase: Available and configured

## Option 1: Test with Production Firebase (Recommended Now)

Since emulators require Java, you can test immediately using production Firebase:

### 1. Clean Up Running Processes

```bash
# Kill any stray Next.js processes
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Administrator*"

# Or use Task Manager to find and kill node.exe processes on port 3000
```

### 2. Start Fresh Dev Server

```bash
# Remove lock file
rm -rf web/.next/dev/lock

# Start dev server
cd web
npm run dev
```

The app should be available at: http://localhost:3000

### 3. Verify Firebase Connection

1. Open http://localhost:3000 in your browser
2. Open browser DevTools (F12)
3. Check Console for Firebase connection message
4. Should see: "🔥 Using production Firebase (emulators disabled)"

## Option 2: Set Up Emulators (For Future Testing)

If you want to use emulators for isolated testing:

### Install Java

**Windows:**
1. Download Java JDK: https://www.oracle.com/java/technologies/downloads/
2. Install JDK 11 or higher
3. Add to PATH:
   - Search "Environment Variables" in Windows
   - Add Java bin folder to Path (e.g., `C:\Program Files\Java\jdk-17\bin`)
4. Restart terminal
5. Verify: `java -version`

**After Java is installed:**
```bash
firebase emulators:start
```

## Quick Testing Checklist (Production Firebase)

### ✅ Phase 1: Basic Functionality (30 min)

**1. Registration & Login**
- [ ] Open http://localhost:3000
- [ ] Click "Create account"
- [ ] Register as Community Member (`test-member@yourmail.com`)
- [ ] Verify email verification prompt
- [ ] Login with new account
- [ ] Check you're redirected to `/jobs`

**2. Job Browsing**
- [ ] View jobs page
- [ ] Test keyword search filter
- [ ] Test location filter
- [ ] Click on a job to view details

**3. Employer Account**
- [ ] Logout
- [ ] Register new account as Employer (`test-employer@yourmail.com`)
- [ ] Verify redirect to `/employer`
- [ ] Check employer dashboard loads

**4. Post a Job**
- [ ] Click "Post a job"
- [ ] Fill out form completely
- [ ] Submit job posting
- [ ] Verify appears on `/jobs` page

**5. Apply to Job**
- [ ] Logout
- [ ] Login as community member
- [ ] Navigate to `/jobs`
- [ ] Find the job you posted
- [ ] Submit application
- [ ] Go to `/member/applications`
- [ ] Verify application appears

**6. Review Applications**
- [ ] Logout
- [ ] Login as employer
- [ ] Go to `/employer/applications`
- [ ] Verify you see the application
- [ ] Update application status to "In Review"
- [ ] Change to "Accepted"

### ✅ Phase 2: Vendor Features (20 min)

**7. Create Vendor Profile**
- [ ] As employer, navigate to `/vendor/setup`
- [ ] Fill out vendor profile form
- [ ] Upload logo image (production Storage will work)
- [ ] Upload hero image
- [ ] Save profile
- [ ] Visit `/shop` to see your vendor

**8. Manage Products**
- [ ] Navigate to `/vendor/products`
- [ ] Create a product/service
- [ ] Edit the product
- [ ] Delete the product

**9. Public Vendor Profile**
- [ ] Get your vendor ID from Firestore console
- [ ] Visit `/shop/[yourVendorId]`
- [ ] Verify public profile displays correctly

**10. Test Demo Vendors**
- [ ] Visit `/shop/demo-vendor-1`
- [ ] Visit `/shop/demo-vendor-2`
- [ ] Visit `/shop/demo-vendor-3`
- [ ] Verify demo profiles load

### ✅ Phase 3: Security Testing (15 min)

**11. Test Application Withdrawal**
- [ ] Login as community member
- [ ] Go to `/member/applications`
- [ ] Withdraw an application
- [ ] Verify status changes to "withdrawn"

**12. Test Role-Based Access**
- [ ] As community member, try to access `/employer`
- [ ] Should redirect to appropriate page
- [ ] As employer, verify you can't apply to jobs
- [ ] Verify application form doesn't appear

**13. Test Vendor Delete**
- [ ] As employer with vendor profile
- [ ] Go to `/vendor/setup`
- [ ] Scroll to "Danger Zone"
- [ ] Delete vendor profile (with confirmations)
- [ ] Verify removed from `/shop`

### ✅ Phase 4: Additional Features (20 min)

**14. Scholarships**
- [ ] As employer, create a scholarship
- [ ] As community member, view scholarships
- [ ] Apply to scholarship
- [ ] Check application in `/member/applications` (Scholarships tab)

**15. Conferences**
- [ ] As employer, create a conference
- [ ] View on `/conferences` page
- [ ] Edit conference details
- [ ] Delete conference

**16. Pow Wows**
- [ ] As employer, create a pow wow
- [ ] As community member, register for pow wow
- [ ] Verify registration appears in Firestore

**17. Contact Form**
- [ ] Navigate to `/contact`
- [ ] Fill out contact form
- [ ] Submit
- [ ] Verify success message

## Verify Security Rules (Production)

### Check Firestore Rules in Console

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Navigate to Firestore → Rules
4. Verify the rules from `firebase.rules` are deployed
5. Check "Simulator" tab to test specific queries

### Check Storage Rules

1. In Firebase Console
2. Navigate to Storage → Rules
3. Verify rules from `storage.rules` are deployed
4. Test image upload permissions

## Deploy Security Rules to Production

If rules aren't deployed yet:

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage:rules

# Or deploy both
firebase deploy --only firestore:rules,storage:rules
```

## Browser DevTools Testing

### Check for Errors

1. Open DevTools (F12)
2. Go to Console tab
3. Look for:
   - ❌ Red errors (fix these)
   - ⚠️  Yellow warnings (review these)
   - ✅ Green Firebase connection messages

### Network Tab

1. Go to Network tab
2. Filter by "XHR/Fetch"
3. Watch for Firestore/Storage requests
4. Check for 403 (permission denied) errors

### Application Tab

1. Check Local Storage
2. Check IndexedDB (Firebase cache)
3. Verify auth tokens are present

## Common Issues & Solutions

### Issue: "Permission denied" errors
**Solution**:
- Verify you're logged in
- Check user role in Firestore `/users/{uid}` collection
- Ensure security rules are deployed

### Issue: Images not uploading
**Solution**:
- Check Firebase Storage is enabled in console
- Verify storage rules are deployed
- Check file size (< 5MB recommended)
- Check browser console for errors

### Issue: Data not appearing
**Solution**:
- Check Firestore console for data
- Verify collection names match code
- Check filter logic isn't too restrictive
- Review query in browser Network tab

### Issue: "Next.js port in use"
**Solution**:
```bash
# Kill the process on port 3000
npx kill-port 3000

# Or start on different port
npm run dev -- -p 3001
```

## Next Steps

Once basic testing is complete:

1. ✅ Review [TESTING_GUIDE.md](TESTING_GUIDE.md) for comprehensive testing
2. ✅ Review [SECURITY_RULES.md](SECURITY_RULES.md) for security documentation
3. ✅ Set up Java and emulators for isolated testing
4. ✅ Consider implementing automated tests (Jest, Cypress)
5. ✅ Set up error monitoring (Sentry, etc.)
6. ✅ Configure production deployment (Vercel, Firebase Hosting)

## Testing Results Template

Track your testing progress:

```
## Test Session: [Date]
Tester: [Name]
Environment: Production Firebase

### Completed Tests
- [x] User registration (community)
- [x] User registration (employer)
- [x] Job posting
- [x] Job application
- [ ] ... (continue checklist)

### Issues Found
1. [Issue description]
   - Severity: High/Medium/Low
   - Steps to reproduce: ...
   - Expected: ...
   - Actual: ...

### Notes
- [Any observations, suggestions, or feedback]
```

## Questions or Issues?

Document any problems you encounter and we can address them next!
