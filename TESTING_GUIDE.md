# IOPPS Testing Guide

This guide provides comprehensive testing procedures for the Indigenous Opportunities Platform.

## Prerequisites

Ensure Firebase emulators are running:
```bash
firebase emulators:start
```

Ensure Next.js dev server is running:
```bash
cd web && npm run dev
```

Access points:
- **App**: http://localhost:3000
- **Emulator UI**: http://localhost:4000
- **Auth Emulator**: http://localhost:9099
- **Firestore Emulator**: http://localhost:8080
- **Storage Emulator**: http://localhost:9199

## Test Accounts Setup

### Create Test Accounts

**Community Member Account:**
- Email: `member@test.com`
- Password: `testpass123`
- Role: `community`

**Employer Account:**
- Email: `employer@test.com`
- Password: `testpass123`
- Role: `employer`

**Note**: Create these accounts through the registration flow and verify the role is set correctly in Firestore.

---

## Testing Checklist

### 1. Authentication Flow Testing

#### Registration (Community Member)
- [ ] Navigate to `/register`
- [ ] Fill out form with community role selected
- [ ] Submit registration
- [ ] Verify email verification prompt appears
- [ ] Check Firestore `/users/{uid}` has `role: "community"`
- [ ] Verify redirect to `/jobs`

#### Registration (Employer)
- [ ] Navigate to `/register`
- [ ] Fill out form with employer role selected
- [ ] Submit registration
- [ ] Verify email verification prompt appears
- [ ] Check Firestore `/users/{uid}` has `role: "employer"`
- [ ] Verify redirect to `/employer`

#### Login
- [ ] Navigate to `/login`
- [ ] Enter valid credentials
- [ ] Verify successful login and redirect
- [ ] Check auth state in browser console
- [ ] Verify role-based navigation (community → /jobs, employer → /employer)

#### Google Sign-In
- [ ] Click "Continue with Google"
- [ ] Complete Google auth flow (emulator)
- [ ] Verify account creation with correct role
- [ ] Verify successful redirect

#### Password Reset
- [ ] Navigate to `/login`
- [ ] Click "Forgot password?"
- [ ] Enter email address
- [ ] Verify success message appears
- [ ] Check emulator for password reset email

#### Logout
- [ ] Click user menu
- [ ] Click "Sign out"
- [ ] Verify redirect to home page
- [ ] Verify auth state cleared

---

### 2. Community Member Flow Testing

Login as: `member@test.com`

#### Job Browsing
- [ ] Navigate to `/jobs`
- [ ] Verify job listings are visible
- [ ] Test keyword search filter
- [ ] Test location filter
- [ ] Test employment type filter
- [ ] Test salary range filter
- [ ] Test "TRC #92 Commitment" filter
- [ ] Test "Indigenous-owned" filter
- [ ] Click on a job to view details

#### Job Application
- [ ] On job detail page, fill out application form
- [ ] Attach resume (test file upload)
- [ ] Provide cover letter or message
- [ ] Submit application
- [ ] Verify success message
- [ ] Check Firestore `/applications` collection for new doc
- [ ] Verify `memberId` matches your uid
- [ ] Verify `status: "submitted"`

#### View Applications
- [ ] Navigate to `/member/applications`
- [ ] Verify "Jobs" tab shows your applications
- [ ] Check application status displays
- [ ] Verify job details are visible

#### Withdraw Application
- [ ] On `/member/applications` page
- [ ] Find a submitted application
- [ ] Click "Withdraw Application"
- [ ] Confirm withdrawal in dialog
- [ ] Verify status changes to "withdrawn"
- [ ] Check Firestore shows `status: "withdrawn"`

#### Scholarship Browsing
- [ ] Navigate to `/scholarships`
- [ ] Verify scholarship listings visible
- [ ] Test filters (keyword, amount, deadline)
- [ ] Click on scholarship to view details

#### Scholarship Application
- [ ] On scholarship detail page
- [ ] Fill out application form (education, essay)
- [ ] Submit application
- [ ] Verify success message
- [ ] Check Firestore `/scholarshipApplications`

#### View Scholarship Applications
- [ ] Navigate to `/member/applications`
- [ ] Switch to "Scholarships" tab
- [ ] Verify scholarship applications are listed
- [ ] Test withdrawal functionality

#### Shop Indigenous
- [ ] Navigate to `/shop`
- [ ] Browse vendor listings
- [ ] Test category filters
- [ ] Test location filter
- [ ] Test "Shipping Worldwide" filter
- [ ] Test "Online only" filter
- [ ] Click "Visit shop" button (external link)
- [ ] Click "View profile" for a vendor

#### Conferences
- [ ] Navigate to `/conferences`
- [ ] Browse conference listings
- [ ] Test filters
- [ ] Click on conference for details

#### Pow Wows
- [ ] Navigate to `/powwows`
- [ ] Browse pow wow listings
- [ ] Click on pow wow for details
- [ ] Fill out registration form
- [ ] Submit registration
- [ ] Verify success message
- [ ] Check Firestore `/powwowRegistrations`

#### Member Profile
- [ ] Navigate to `/member/profile`
- [ ] Update profile information
- [ ] Save changes
- [ ] Verify updates persist

---

### 3. Employer Flow Testing

Login as: `employer@test.com`

#### Employer Dashboard
- [ ] Navigate to `/employer`
- [ ] Verify dashboard loads
- [ ] See list of posted jobs
- [ ] See list of conferences
- [ ] See application statistics

#### Post a Job
- [ ] Click "Post a job" or navigate to `/employer/jobs/new`
- [ ] Fill out job posting form:
  - [ ] Title, description, location
  - [ ] Employment type, salary range
  - [ ] Application email/link
  - [ ] Requirements, benefits
  - [ ] TRC #92 commitment checkbox
  - [ ] Indigenous-owned checkbox
- [ ] Submit job posting
- [ ] Verify success message
- [ ] Check Firestore `/jobs` collection
- [ ] Verify `employerId` matches your uid
- [ ] Verify job appears on `/jobs` page

#### Edit a Job
- [ ] On `/employer` dashboard, find a job
- [ ] Click "Edit" button
- [ ] Navigate to `/employer/jobs/[jobId]/edit`
- [ ] Verify form is pre-filled with existing data
- [ ] Make changes to job details
- [ ] Save changes
- [ ] Verify success message
- [ ] Check updates in Firestore

#### Delete a Job
- [ ] On `/employer` dashboard
- [ ] Click "Delete" on a job
- [ ] Verify confirmation dialog appears
- [ ] Confirm deletion
- [ ] Verify job is removed from list
- [ ] Check Firestore - job should be deleted

#### View Applications
- [ ] Navigate to `/employer/applications`
- [ ] Verify applications to your jobs are listed
- [ ] Check application details (resume, cover letter)
- [ ] Verify you CAN see applications to your jobs
- [ ] Verify you CANNOT see applications to other employers' jobs

#### Update Application Status
- [ ] On `/employer/applications` page
- [ ] Select an application
- [ ] Change status dropdown (submitted → in review → accepted/rejected)
- [ ] Verify status updates in UI
- [ ] Check Firestore for updated status

#### Employer Profile
- [ ] Navigate to `/employer/profile`
- [ ] Update employer profile:
  - [ ] Company name, description
  - [ ] TRC #92 commitment statement
  - [ ] Indigenous-owned checkbox
  - [ ] Contact information
  - [ ] Logo upload (test)
- [ ] Save profile
- [ ] Verify updates persist
- [ ] Visit public profile at `/employers/[employerId]`
- [ ] Verify public data is visible

#### Post a Conference
- [ ] Navigate to `/employer/conferences/new`
- [ ] Fill out conference form
- [ ] Submit conference
- [ ] Verify success message
- [ ] Check Firestore `/conferences`

#### Edit Conference
- [ ] Navigate to conference list
- [ ] Click edit on a conference
- [ ] Update details
- [ ] Save changes
- [ ] Verify updates

#### Delete Conference
- [ ] Click delete on a conference
- [ ] Confirm deletion
- [ ] Verify removed from Firestore

#### Post a Scholarship
- [ ] Create scholarship posting
- [ ] Fill out details (amount, deadline, criteria)
- [ ] Submit
- [ ] Verify in Firestore `/scholarships`
- [ ] Check it appears on `/scholarships` page

#### Vendor Profile Setup
- [ ] Navigate to `/vendor/setup`
- [ ] Fill out vendor profile form:
  - [ ] Business name, tagline, category
  - [ ] Location, region
  - [ ] About, origin story, community connections
  - [ ] Offerings
  - [ ] Shipping options (Worldwide, Online, In-person)
  - [ ] Contact info (email, phone, website)
  - [ ] Social media links (Instagram, Facebook, TikTok)
- [ ] Upload logo image
- [ ] Verify upload success and preview
- [ ] Upload hero image
- [ ] Verify upload success and preview
- [ ] Save vendor profile
- [ ] Check Firestore `/vendors/{uid}`
- [ ] Verify vendor appears on `/shop` page

#### Vendor Image Upload Testing
- [ ] On `/vendor/setup` page
- [ ] Select logo image file
- [ ] Click "Upload"
- [ ] Verify upload progress
- [ ] Check Firebase Storage at `/vendors/{uid}/logo-{timestamp}.jpg`
- [ ] Verify image URL saved to Firestore
- [ ] Verify image preview displays
- [ ] Test "Remove" button for logo
- [ ] Repeat for hero image

#### Manage Products/Services
- [ ] Navigate to `/vendor/products`
- [ ] Click "Add Product/Service"
- [ ] Fill out product form:
  - [ ] Name, description, category
  - [ ] Price (optional)
  - [ ] Tags
  - [ ] Image URL (optional)
- [ ] Create product
- [ ] Verify appears in list
- [ ] Check Firestore `/productServiceListings`
- [ ] Edit a product
- [ ] Delete a product (with confirmation)

#### Delete Vendor Profile
- [ ] Scroll to "Danger Zone" on `/vendor/setup`
- [ ] Click "Delete vendor profile"
- [ ] Verify first confirmation dialog
- [ ] Click again to confirm
- [ ] Verify second confirmation
- [ ] Confirm deletion
- [ ] Verify redirect to home
- [ ] Check vendor removed from Firestore
- [ ] Check vendor no longer appears on `/shop`

---

### 4. Security Rules Testing

#### Test Unauthorized Access

**Community Member Attempting Employer Actions:**
- [ ] Login as community member
- [ ] Try to access `/employer` - should redirect
- [ ] Try to navigate to `/employer/jobs/new` - should be blocked
- [ ] Try to access `/vendor/setup` - should be blocked
- [ ] Check browser console for permission errors

**Employer Attempting Community Actions:**
- [ ] Login as employer
- [ ] Try to access `/member/profile` - should redirect
- [ ] Try to apply to a job - form should not appear

#### Test Data Access Restrictions

**Applications Access:**
- [ ] Login as employer A
- [ ] Create a job
- [ ] Login as community member
- [ ] Apply to employer A's job
- [ ] Login as employer B (different account)
- [ ] Navigate to `/employer/applications`
- [ ] Verify you CANNOT see employer A's applications
- [ ] Check Firestore security rules preventing access

**Vendor Profile Access:**
- [ ] Login as employer A
- [ ] Create vendor profile
- [ ] Login as employer B
- [ ] Try to edit employer A's vendor profile
- [ ] Verify blocked by security rules

**Member Profile Privacy:**
- [ ] Login as member A
- [ ] Create member profile
- [ ] Logout
- [ ] Try to access member A's profile data via direct Firestore query
- [ ] Verify blocked by security rules

#### Test Storage Security Rules

**Vendor Image Upload:**
- [ ] Login as employer A with uid `employerA123`
- [ ] Try to upload image to `/vendors/employerA123/logo.jpg` - should succeed
- [ ] Try to upload image to `/vendors/employerB456/logo.jpg` - should fail
- [ ] Check browser console for permission denied error

**Public Image Access:**
- [ ] Logout or use incognito
- [ ] Access vendor image URL directly
- [ ] Verify image loads (public read access)

---

### 5. Page Load & Navigation Testing

#### Public Pages (No Auth Required)
- [ ] `/` - Home page loads
- [ ] `/about` - About page loads
- [ ] `/contact` - Contact page loads
- [ ] `/jobs` - Jobs page loads
- [ ] `/shop` - Shop page loads
- [ ] `/conferences` - Conferences page loads
- [ ] `/powwows` - Pow wows page loads
- [ ] `/scholarships` - Scholarships page loads
- [ ] `/live` - Live streams page loads
- [ ] `/privacy` - Privacy policy loads
- [ ] `/terms` - Terms of service loads
- [ ] `/login` - Login page loads
- [ ] `/register` - Registration page loads
- [ ] `/forgot-password` - Password reset page loads

#### Protected Pages (Auth Required)
- [ ] `/member/profile` - Loads for community members
- [ ] `/member/applications` - Loads for community members
- [ ] `/employer` - Loads for employers
- [ ] `/employer/jobs/new` - Loads for employers
- [ ] `/employer/applications` - Loads for employers
- [ ] `/vendor/setup` - Loads for employers
- [ ] `/vendor/products` - Loads for employers

#### Public Profile Pages
- [ ] `/employers/[employerId]` - Employer profile loads
- [ ] `/shop/[vendorId]` - Vendor profile loads
- [ ] Test with demo vendors: `/shop/demo-vendor-1`, `/shop/demo-vendor-2`, `/shop/demo-vendor-3`

---

### 6. Filter & Search Testing

#### Jobs Page Filters
- [ ] Keyword search (test: "developer", "manager")
- [ ] Location filter (test: "Remote", "Vancouver")
- [ ] Employment type (Full-time, Part-time, Contract)
- [ ] Salary range filter
- [ ] TRC #92 commitment filter
- [ ] Indigenous-owned filter
- [ ] Combine multiple filters
- [ ] Reset filters button

#### Shop Page Filters
- [ ] Quick filter chips (Gifts & Art, Services, Food, etc.)
- [ ] Keyword search
- [ ] Category dropdown
- [ ] Location filter
- [ ] "Shipping Worldwide" checkbox
- [ ] "Online only" checkbox
- [ ] Reset filters

#### Scholarships Page Filters
- [ ] Keyword search
- [ ] Amount range filter
- [ ] Deadline filter
- [ ] Category filter

#### Employer Applications Filters
- [ ] Status filter (All, Submitted, In Review, Accepted, Rejected, Withdrawn)
- [ ] Job filter dropdown
- [ ] Search by applicant name/email

---

### 7. Pagination Testing

#### Jobs Page
- [ ] Load page with 20+ jobs
- [ ] Verify initial load shows 20 jobs
- [ ] Click "Load More"
- [ ] Verify next batch loads
- [ ] Continue until all jobs shown

#### Shop Page
- [ ] Load with 20+ vendor listings
- [ ] Verify pagination works
- [ ] Test "Load more businesses" button

#### Scholarships Page
- [ ] Test pagination with multiple scholarships
- [ ] Verify load more functionality

#### Employer Applications
- [ ] With 50+ applications
- [ ] Verify initial load shows 50
- [ ] Test "Load More Applications" button

---

### 8. Empty State Testing

#### No Data Scenarios
- [ ] Jobs page with no jobs posted - verify empty state with CTA
- [ ] Shop page with no vendors - verify empty state
- [ ] Scholarships with no listings - verify empty state
- [ ] Conferences with no events - verify empty state
- [ ] Pow wows with no events - verify empty state
- [ ] Member applications with no applications - verify empty state
- [ ] Employer dashboard with no jobs - verify empty state

#### Filtered Results
- [ ] Apply filters that return no results
- [ ] Verify "No results match your filters" message
- [ ] Verify filter reset works

---

### 9. Form Validation Testing

#### Registration Form
- [ ] Submit without email - verify error
- [ ] Submit with invalid email format - verify error
- [ ] Submit without password - verify error
- [ ] Submit with weak password - verify error
- [ ] Submit without name - verify error
- [ ] Submit without role selected - verify error

#### Job Posting Form
- [ ] Submit without title - verify error
- [ ] Submit without description - verify error
- [ ] Submit without location - verify error
- [ ] Submit without employment type - verify error
- [ ] Verify all required fields validated

#### Vendor Profile Form
- [ ] Submit without business name - verify error
- [ ] Submit without category - verify error
- [ ] Submit without location - verify error
- [ ] Submit with invalid email - verify error
- [ ] Submit with invalid website URL - verify error

---

### 10. Contact Form Testing

- [ ] Navigate to `/contact`
- [ ] Fill out contact form (name, email, subject, message)
- [ ] Submit form
- [ ] Verify success message
- [ ] Check Firestore `/contactSubmissions` collection
- [ ] Verify submission created with correct data
- [ ] Test form validation (required fields)

---

### 11. Error Handling Testing

#### Network Errors
- [ ] Stop Firebase emulators
- [ ] Try to load data-dependent page
- [ ] Verify error message displays
- [ ] Restart emulators
- [ ] Verify recovery

#### Authentication Errors
- [ ] Login with wrong password - verify error message
- [ ] Login with non-existent email - verify error message
- [ ] Logout and try to access protected page - verify redirect

#### Permission Errors
- [ ] Try to access data you don't own
- [ ] Verify permission denied error
- [ ] Check console for security rule violations

---

### 12. Mobile Responsiveness Testing

Test on different screen sizes (use browser dev tools):
- [ ] Mobile (375px) - iPhone SE
- [ ] Mobile (390px) - iPhone 12 Pro
- [ ] Tablet (768px) - iPad
- [ ] Desktop (1024px)
- [ ] Large Desktop (1440px)

Verify for each breakpoint:
- [ ] Navigation menu (hamburger on mobile)
- [ ] Job cards layout
- [ ] Vendor cards layout
- [ ] Forms are usable
- [ ] Filters are accessible
- [ ] Buttons are tappable
- [ ] Images scale properly

---

### 13. Performance Testing

#### Page Load Times
- [ ] Jobs page load time < 2s
- [ ] Shop page load time < 2s
- [ ] Dashboard load time < 2s
- [ ] Vendor profile page load time < 2s

#### Large Dataset Testing
- [ ] Create 100+ jobs - verify pagination works
- [ ] Create 100+ applications - verify employer view performs well
- [ ] Test search with large datasets

---

### 14. Browser Compatibility Testing

Test on multiple browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

Verify:
- [ ] All features work
- [ ] Styling is consistent
- [ ] No console errors
- [ ] File uploads work

---

## Known Issues / Limitations

Document any issues found during testing:

1. **Issue**: [Description]
   - **Steps to Reproduce**: [Steps]
   - **Expected**: [Expected behavior]
   - **Actual**: [Actual behavior]
   - **Severity**: [Critical/High/Medium/Low]

---

## Testing Completion Checklist

- [ ] All authentication flows tested
- [ ] All community member flows tested
- [ ] All employer flows tested
- [ ] Security rules verified
- [ ] All pages load correctly
- [ ] All filters work
- [ ] Pagination tested
- [ ] Empty states verified
- [ ] Forms validated
- [ ] Error handling tested
- [ ] Mobile responsiveness checked
- [ ] No console errors in production build
- [ ] All user roles tested
- [ ] Data access permissions verified

---

## Production Readiness Checklist

Before deploying to production:

- [ ] All tests passed
- [ ] Security rules deployed and verified
- [ ] Environment variables configured for production
- [ ] Firebase project set up for production
- [ ] Analytics configured (if applicable)
- [ ] Error monitoring set up (e.g., Sentry)
- [ ] Performance monitoring enabled
- [ ] Email configuration for production
- [ ] Domain configured and SSL enabled
- [ ] Backup strategy in place
- [ ] Data migration plan (if needed)
- [ ] User documentation prepared
- [ ] Support channels established

---

## Post-Launch Monitoring

After launch, monitor:

- [ ] User registration rate
- [ ] Job posting rate
- [ ] Application submission rate
- [ ] Vendor profile creation rate
- [ ] Error rates
- [ ] Page load performance
- [ ] User feedback
- [ ] Security rule violations in logs
- [ ] Storage usage
- [ ] Database read/write counts

---

## Support & Troubleshooting

### Common Issues

**Issue: "Permission denied" errors**
- Check user is logged in
- Verify user role is correct in Firestore `/users/{uid}`
- Check security rules match expected permissions
- Review Firestore Rules logs in emulator UI

**Issue: Images not loading**
- Verify Storage emulator is running
- Check image URLs are correct
- Verify storage security rules allow read access
- Check browser console for CORS errors

**Issue: Data not appearing**
- Check Firestore emulator for data
- Verify collection names match code
- Check query filters aren't too restrictive
- Review browser console for errors

**Issue: Filters not working**
- Check filter state in React DevTools
- Verify filter logic in useMemo dependencies
- Check for typos in field names
- Verify data has the fields being filtered

---

## Feedback & Bug Reporting

Document user feedback and bugs discovered during testing:

**Template:**
- **Reporter**: [Name/Email]
- **Date**: [Date]
- **Feature**: [Which feature]
- **Description**: [Detailed description]
- **Steps**: [How to reproduce]
- **Priority**: [High/Medium/Low]
- **Status**: [New/In Progress/Resolved]
