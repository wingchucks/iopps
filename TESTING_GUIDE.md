# 🧪 IOPPS Admin Features - Testing Guide

## Prerequisites

Before starting, make sure:
- [x] Development server is running (`npm run dev`)
- [ ] You're logged in as **nathan.arias@iopps.ca** (admin account)
- [ ] Browser is open to http://localhost:3000

---

## Test 1: Admin Dashboard

**URL**: http://localhost:3000/admin

### What to Check:
- [ ] Page loads without errors
- [ ] See statistics cards:
  - Total Users
  - Total Jobs
  - Total Conferences
  - Total Scholarships
  - Active Employers
  - Total Applications
- [ ] Quick action links visible:
  - User Management
  - Employer Management
  - Content Moderation
  - Platform Settings
  - RSS Feeds (new!)
  - Analytics
- [ ] Recent activity section displays

### Expected Result:
✅ Dashboard displays with all statistics and navigation links

---

## Test 2: User Management

**URL**: http://localhost:3000/admin/users

### What to Check:
- [ ] User list loads
- [ ] Filter buttons work:
  - All Users
  - Community Members
  - Employers
  - Moderators
- [ ] Search box is functional
- [ ] For each user, see:
  - Name and email
  - Role badge
  - Enabled/Disabled status
  - Actions: Update Role, Enable/Disable
- [ ] **"Login As" button** only visible if you're logged in as nathan.arias@iopps.ca

### Test Actions:
1. **Search for a user** - Type in search box
2. **Filter users** - Click "Employers" filter
3. **Update role** - Change a test user's role (CAREFUL: make a test account first!)
4. **DO NOT test "Login As"** unless you want to be logged out

### Expected Result:
✅ All user management features work, "Login As" restricted correctly

---

## Test 3: Employer Management

**URL**: http://localhost:3000/admin/employers

### What to Check:
- [ ] Employer list loads
- [ ] Filter buttons work:
  - All
  - Pending
  - Approved
  - Rejected
- [ ] For each employer, see:
  - Company name
  - Status badge (Pending/Approved/Rejected)
  - Actions: Approve/Reject
- [ ] **"Login As" button** only visible if you're nathan.arias@iopps.ca

### Test Actions:
1. **Filter by status** - Click "Pending"
2. **View employer details** - Click on an employer card
3. **Approve an employer** (if any pending) - Click "Approve"

### Expected Result:
✅ Employer approval workflow functional

---

## Test 4: Content Moderation ⭐ NEW

**URL**: http://localhost:3000/admin/content

### What to Check:
- [ ] Contact submission list loads
- [ ] Filter buttons work:
  - All
  - New
  - Read
  - Responded
- [ ] For each submission, see:
  - Name and email
  - Subject
  - Status badge
  - Actions: Mark as Read, Mark as Responded, Reply via Email

### Test Actions:
1. **Filter by status** - Click "New"
2. **Mark as read** - Click "Mark as Read" on a submission
3. **Click "Reply via Email"** - Should open email client with pre-filled address

### Expected Result:
✅ Content moderation interface works, status updates persist

---

## Test 5: Platform Settings ⭐ NEW

**URL**: http://localhost:3000/admin/settings

### What to Check:
- [ ] Settings page loads
- [ ] Three main sections visible:
  1. Maintenance Mode
  2. Announcement Banner
  3. Feature Flags

### Test Actions:

#### Maintenance Mode:
1. **Toggle maintenance mode** - Switch on
2. **Check effect** - Open http://localhost:3000 in incognito mode
   - Should show maintenance message (or check as regular user)
3. **Turn it back off** - Return to settings, toggle off

#### Announcement Banner:
1. **Enable banner** - Toggle "Active"
2. **Set message** - Type: "Test announcement!"
3. **Choose type** - Select "Info"
4. **Save settings** - Click "Save Changes"
5. **Verify** - Open homepage, should see blue banner at top
6. **Disable banner** - Return to settings, toggle off

#### Feature Flags:
1. **Toggle Stripe Payments** - Switch off
2. **Toggle Job Posting** - Switch off
3. **Save settings**
4. **Verify** - Jobs page should handle disabled features
5. **Re-enable everything**

### Expected Result:
✅ Settings save and take effect immediately
✅ Maintenance mode works
✅ Announcement banner appears/disappears correctly

---

## Test 6: RSS Feeds ⭐ NEW

**URL**: http://localhost:3000/admin/feeds

### What to Check:
- [ ] Feeds page loads
- [ ] "+ Add Feed" button visible
- [ ] If feeds exist, see:
  - Feed name
  - Feed URL
  - Last synced time
  - Total jobs imported
  - Actions: Sync Now, Activate/Deactivate, Delete

### Test Actions:

#### Add a New Feed:
1. **Click "+ Add Feed"**
2. **Fill in form**:
   - Feed Name: "Test IOPPS Feed"
   - Feed URL: `https://iopps.ca/feeds/standard.xml`
   - Employer ID: (use your own Firebase UID or a test employer ID)
   - Employer Name: "Test Employer"
3. **Click "Add Feed"**
4. **Verify** - Feed appears in list

#### Sync a Feed:
1. **Click "Sync Now"** on the test feed
2. **Wait for completion** - Should take 5-10 seconds
3. **Check result** - Should see alert:
   - "Imported: X jobs"
   - "Skipped: Y jobs"
   - "Total in feed: 27"
4. **Verify jobs imported**:
   - Go to http://localhost:3000/jobs
   - Look for "Summer Student", "Slot Attendant", etc.

#### Sync Again (Duplicate Detection):
1. **Click "Sync Now" again** on same feed
2. **Check result** - Should see:
   - "Imported: 0 jobs"
   - "Skipped: 27 jobs" (all duplicates)

#### Deactivate Feed:
1. **Click "Deactivate"**
2. **Verify** - "Sync Now" button should be disabled
3. **Reactivate** - Click "Activate"

### Expected Result:
✅ Feeds can be added successfully
✅ Jobs are imported from XML feed
✅ Duplicate detection prevents re-importing
✅ Feed management (activate/deactivate) works

---

## Test 7: Impersonation Feature (CAREFUL!)

**Only test if absolutely necessary**

### Prerequisites:
- You are logged in as **nathan.arias@iopps.ca**
- You have a test user account created

### Test Actions:
1. Go to `/admin/users`
2. Find a test user
3. Click "Login As"
4. **Confirm** - You'll be logged out and logged in as that user
5. **Verify** - Check that:
   - You're now viewing the site as that user
   - Admin pages are not accessible
6. **Log out** and log back in as admin

### Expected Result:
✅ Impersonation works
✅ Only nathan.arias@iopps.ca can see the button
✅ Successfully logs in as target user

⚠️ **WARNING**: You'll be logged out of your admin account!

---

## Test 8: Analytics (Existing)

**URL**: http://localhost:3000/admin/analytics

### What to Check:
- [ ] Page loads
- [ ] Charts render
- [ ] Statistics display correctly

### Expected Result:
✅ Analytics page shows platform metrics

---

## Test 9: Mobile Responsiveness

### Test Actions:
1. **Open DevTools** - Press F12
2. **Toggle device toolbar** - Ctrl+Shift+M (or click phone icon)
3. **Select device** - iPhone 12 Pro
4. **Navigate through admin pages**:
   - Dashboard
   - User Management
   - Feeds
   - Settings

### Expected Result:
✅ All pages are usable on mobile
✅ Tables scroll horizontally if needed
✅ Buttons are tappable

---

## Test 10: Error Handling

### Test Actions:

#### Test 404 Page:
1. **Navigate to** http://localhost:3000/nonexistent-page
2. **Check** - Custom 404 page displays
3. **Click "Go Home"** - Returns to homepage

#### Test Unauthorized Access:
1. **Log out** (or use incognito)
2. **Try to access** http://localhost:3000/admin
3. **Check** - Redirected to login or homepage
4. **Log back in**

### Expected Result:
✅ Error pages are branded and helpful
✅ Protected routes require authentication

---

## 📋 Testing Checklist Summary

After completing all tests above, verify:

- [ ] ✅ Admin Dashboard loads
- [ ] ✅ User Management works (search, filter, role updates)
- [ ] ✅ Employer Management works (approval workflow)
- [ ] ✅ Content Moderation works (filter, status updates)
- [ ] ✅ Platform Settings works (maintenance mode, banner, flags)
- [ ] ✅ RSS Feeds works (add, sync, duplicate detection)
- [ ] ✅ Impersonation restricted correctly
- [ ] ✅ Analytics displays
- [ ] ✅ Mobile responsive
- [ ] ✅ Error pages work

---

## 🐛 Common Issues & Solutions

### Issue: Page doesn't load
**Solution**: Check browser console (F12) for errors

### Issue: "Login As" button visible for wrong user
**Solution**: Clear browser cache, verify logged-in email

### Issue: RSS feed sync fails
**Solution**: 
- Check feed URL is accessible
- Verify employer ID exists in Firebase
- Check browser console for errors

### Issue: Settings don't save
**Solution**:
- Check browser console for errors
- Verify Firestore connection
- Check user has admin role

### Issue: Maintenance mode not working
**Solution**:
- Verify settings are saved
- Try hard refresh (Ctrl+F5)
- Check `platformSettings` collection in Firestore

---

## ✅ Test Results Log

Document your test results:

| Feature | Status | Notes |
|---------|--------|-------|
| Admin Dashboard | ⬜ Pass / ❌ Fail | |
| User Management | ⬜ Pass / ❌ Fail | |
| Employer Management | ⬜ Pass / ❌ Fail | |
| Content Moderation | ⬜ Pass / ❌ Fail | |
| Platform Settings | ⬜ Pass / ❌ Fail | |
| RSS Feeds | ⬜ Pass / ❌ Fail | |
| Impersonation | ⬜ Pass / ❌ Fail | |
| Mobile Responsive | ⬜ Pass / ❌ Fail | |
| Error Pages | ⬜ Pass / ❌ Fail | |

---

**When you're done testing, share your results and I'll help fix any issues!** 🚀
