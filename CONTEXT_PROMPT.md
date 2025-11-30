# IOPPS Project Context Prompt

Use this prompt to provide complete context about the IOPPS project to AI assistants or new developers.

---

## Project Context

You are working on **IOPPS (Indigenous Opportunities & Partnerships Platform)** - a platform empowering Indigenous success across Canada through jobs, conferences, scholarships, pow wows, Indigenous-owned businesses, and live streams. The platform supports economic reconciliation and TRC Call to Action 92.

**Live Website:** https://iopps.ca
**Project Owner:** Nathan Arias (nathan.arias@iopps.ca)
**Status:** Beta testing ready, job pillar 100% complete

## Technology Stack

**Frontend:**
- Web: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- Mobile: React Native, Expo
- Design: Dark theme (slate-900 bg #0F172A, teal accent #14B8A6)

**Backend & Services:**
- Database: Firebase Firestore (NoSQL)
- Auth: Firebase Authentication
- Storage: Firebase Cloud Storage
- Payments: Stripe (TEST mode - no real charges)
- Email: Resend API
- Hosting: Vercel (web), Expo (mobile)
- Cron Jobs: Vercel Cron

**Infrastructure:**
- Firebase Project: iopps-c2224
- Auto-deploy: GitHub push → Vercel builds → iopps.ca
- Project Directory: `c:\Users\natha\OneDrive\Documents\iopps`

## User Roles & Capabilities

### 1. Community Members (Job Seekers) - Free
- Browse jobs, conferences, scholarships, pow wows, shop
- Quick Apply to jobs (web & mobile)
- Track applications at `/member/applications`
- View status: submitted, reviewed, shortlisted, hired, rejected
- Withdraw pending applications
- Receive notifications
- Build profile with experience, education, skills
- Save jobs for later

**Key Pages:** `/member/dashboard`, `/member/profile`, `/member/applications`, `/jobs`, `/saved`

### 2. Employers - Paid, Requires Admin Approval
- Sign up → Profile → Status: "pending" → Admin approves/rejects
- Once approved: Post jobs, manage applications, view analytics
- Subscription tiers with job credits (TIER1/TIER2/TIER3)
- View applicants, update application status
- Subscription management at `/employer/subscription`
- Company profile with logo, description, website

**Key Pages:** `/employer/dashboard`, `/employer/jobs/new`, `/employer/jobs/[jobId]`, `/employer/subscription`, `/employer/profile`

### 3. Admins - Super Admin Email in Config
- Approve/reject pending employers at `/admin/employers`
- View all employers with filtering, search, sort
- Moderate content across platform
- Access admin dashboard at `/admin`

## File Structure

```
iopps/
├── web/                          # Next.js web application
│   ├── app/
│   │   ├── employer/            # Employer features
│   │   │   ├── dashboard/
│   │   │   ├── jobs/new/        # Create job posting
│   │   │   ├── jobs/[jobId]/    # Job details & applications
│   │   │   ├── subscription/    # Subscription management
│   │   │   └── profile/
│   │   ├── member/              # Member features
│   │   │   ├── dashboard/
│   │   │   ├── applications/    # Track applications
│   │   │   └── profile/
│   │   ├── admin/               # Admin features
│   │   │   └── employers/       # Employer approval panel
│   │   ├── api/
│   │   │   ├── stripe/          # Stripe webhooks & checkout
│   │   │   │   └── webhook/
│   │   │   └── cron/
│   │   │       └── expire-jobs/ # Daily job expiration
│   │   ├── jobs/                # Public job listings
│   │   └── pricing/             # Subscription pricing
│   ├── components/
│   │   ├── SiteHeader.tsx       # Main navigation
│   │   └── NotificationBell.tsx # Notification dropdown
│   └── lib/
│       ├── firebase.ts          # Firebase client config
│       ├── firestore.ts         # **CRITICAL** All Firestore functions
│       ├── stripe.ts            # Stripe config & products
│       └── types.ts             # TypeScript types
├── mobile/                       # React Native mobile app
│   ├── src/
│   │   ├── screens/
│   │   │   ├── QuickApplyScreen.tsx  # Job application
│   │   │   └── JobsScreen.tsx
│   │   └── lib/firebase.ts
│   ├── App.tsx
│   └── app.json                 # Expo configuration
├── .env.local                   # Environment variables
├── vercel.json                  # Cron jobs configuration
├── firebase.json                # Firebase emulator settings
└── service-account.json         # Firebase Admin SDK

```

## Key Firestore Functions (web/lib/firestore.ts)

**Jobs:**
- `createJobPosting(input)` - Create new job
- `getJobPosting(jobId)` - Get single job
- `listJobs()` - Get all active jobs

**Applications:**
- `createJobApplication(input)` - Apply to job
- `checkExistingApplication(memberId, jobId)` - Prevent duplicates
- `listMemberApplications(memberId)` - Get user's applications
- `updateApplicationStatus(appId, status)` - Update status

**Employers:**
- `listEmployers(status?)` - Get employers (with optional filter)
- `updateEmployerStatus(userId, status, approvedBy?, reason?)` - Approve/reject
- `getEmployerProfile(userId)` - Get employer profile

**Notifications:**
- `getUserNotifications(userId, limit)` - Get notifications
- `markNotificationAsRead(notificationId)` - Mark as read
- `createNotification(params)` - Create notification

## Stripe Configuration (TEST Mode)

**Account:** https://dashboard.stripe.com/test/dashboard

**Keys (in .env.local):**
```
STRIPE_SECRET_KEY=sk_test_51Kaumz4KL7oAnlGU...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51Kaumz4KL7oAnlGU...
STRIPE_WEBHOOK_SECRET=whsec_WXXQP4yazHZBaIkya1IbVXzQiGELyeah
```

**Test Cards:**
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- 3D Secure: 4000 0027 6000 3184

**Products (Configured in web/lib/stripe.ts):**

1. **Job Posts:**
   - SINGLE: $125 CAD, 30 days
   - FEATURED: $300 CAD, 45 days with spotlight

2. **Subscription Tiers (Annual):**
   - TIER1: $1,250/year, 15 job credits + 15 featured
   - TIER2: $2,500/year, unlimited posts + 5 featured
   - TIER3: $3,750/year, unlimited everything + podcast

3. **Conference Posts:**
   - STANDARD: $250 CAD, 90 days
   - FEATURED: $400 CAD, 120 days

4. **Vendor Listings:**
   - MONTHLY: $50/month (first month FREE)
   - ANNUAL: $400/year (save $200)

**Payment Flow:**
1. User selects product/tier
2. Redirected to Stripe Checkout
3. Completes payment (TEST cards accepted)
4. Webhook to `/api/stripe/webhook`
5. Creates/updates in Firestore
6. Redirects to success page

## Firebase Configuration

**Project:** iopps-c2224
**Console:** https://console.firebase.google.com/project/iopps-c2224
**Admin Email:** nathan.arias@iopps.ca

**Collections:**
- `employers` - Employer profiles with subscription data
- `jobs` - Job postings with payment info
- `applications` - Job applications from members
- `memberProfiles` - Community member profiles
- `notifications` - User notifications
- `conversations` - Messaging threads
- `messages` - Individual messages

**Environment Variables (.env.local):**
```
NEXT_PUBLIC_FIREBASE_PROJECT_ID=iopps-c2224
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDFZxqF7b6j7KwINbHHqYWZNrVBE8zTeEo
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=iopps-c2224.firebaseapp.com
NEXT_PUBLIC_USE_EMULATORS=false
```

## Recent Work Completed (Last Session)

We completed **7 critical features** to make the job pillar 100% complete:

1. **Duplicate Application Prevention**
   - Function: `checkExistingApplication()` in firestore.ts
   - Prevents users from applying twice to same job

2. **Mobile Quick Apply**
   - File: `mobile/src/screens/QuickApplyScreen.tsx`
   - Full application submission from mobile app
   - Includes duplicate checking, notifications

3. **Member Applications Dashboard**
   - File: `web/app/member/applications/page.tsx`
   - Stats dashboard, filtering, status badges
   - Withdraw application functionality

4. **Employer Subscription Dashboard**
   - File: `web/app/employer/subscription/page.tsx`
   - Shows tier, credits remaining, expiration
   - Progress bars for job credits

5. **Job Expiration Automation**
   - File: `web/app/api/cron/expire-jobs/route.ts`
   - Vercel Cron runs daily at midnight
   - Auto-deactivates expired jobs

6. **Admin Employer Approval Panel**
   - File: `web/app/admin/employers/page.tsx`
   - Review pending employers
   - Approve/reject with reasons
   - Filter, search, sort functionality

7. **Notification System**
   - File: `web/components/NotificationBell.tsx`
   - Bell icon with unread badge
   - Dropdown menu, mark as read
   - Different icons per notification type

## Complete User Flows

### Employer Job Posting Flow
```
1. Sign up (role: employer)
2. Complete profile (company name, logo, description)
3. Status: "pending" → Wait for admin
4. Admin approves at /admin/employers
5. Status: "approved" → Can post jobs
6. Go to /employer/jobs/new
7. Fill job details (title, description, location, salary)
8. Choose duration (30/60/90 days)
9. Pay with Stripe (TEST card: 4242 4242 4242 4242)
10. Job goes live at /jobs
11. View applicants at /employer/jobs/[jobId]
12. Update application status (reviewed, shortlisted, hired, rejected)
13. Receive notifications when candidates apply
```

### Member Application Flow
```
1. Sign up (role: community)
2. Build profile at /member/profile
3. Browse jobs at /jobs
4. Click job → View details
5. Click "Quick Apply"
6. Submit cover letter
7. Application saved to Firestore
8. Track at /member/applications
9. Receive notifications on status changes
10. Can withdraw if submitted/reviewed
```

### Admin Approval Flow
```
1. Employer signs up → Status: "pending"
2. Admin logs in → Go to /admin/employers
3. See pending employers list
4. Review: company name, website, description, logo
5. Click "Approve" or "Reject"
6. If reject: enter rejection reason
7. Employer receives notification
8. If approved: employer can post jobs
```

## Scheduled Tasks (Vercel Cron)

Configured in `vercel.json`:

1. **Daily Job Alerts** - 9:00 AM daily
   - `/api/emails/send-job-alerts/daily`

2. **Weekly Job Alerts** - 9:00 AM Mondays
   - `/api/emails/send-job-alerts/weekly`

3. **Expire Jobs** - Midnight daily
   - `/api/cron/expire-jobs`
   - Auto-deactivates jobs where `expiresAt` or `closingDate` has passed

## Development Commands

**Web:**
```bash
cd web
npm run dev  # http://localhost:3000
```

**Mobile:**
```bash
cd mobile
npx expo start  # Scan QR code with Expo Go app
```

**Firebase Emulators:**
```bash
firebase emulators:start --only firestore,auth,storage
# UI: localhost:8080
```

**Deploy:**
```bash
git add .
git commit -m "Description"
git push origin main  # Auto-deploys to Vercel
```

## Design System

**Theme:**
- Background: Dark mode (slate-900: #0F172A)
- Primary accent: Teal (#14B8A6)
- Text: Slate shades (100-500)
- Borders: Slate-800/700

**Patterns:**
- Card-based layouts
- Responsive (mobile-first)
- Loading states with spinners
- Error handling on all async operations
- Confirmation dialogs for destructive actions

## Important Notes

1. **Stripe is in TEST MODE** - No real charges, use test cards
2. **Firebase is PRODUCTION** - Using live database (not emulators)
3. **Auto-deployment** - Push to GitHub triggers Vercel deploy
4. **Admin approval required** - Employers must be approved before posting
5. **Job credits system** - Subscriptions include credits that get consumed
6. **Unlimited posts** - TIER2 and TIER3 have unlimited (credits = -1)
7. **Notifications** - Auto-created on: applications, status changes, approvals
8. **Mobile & Web sync** - Both use same Firebase database

## Current Status

✅ **Job pillar 100% complete**
- Employer flow: signup → approval → post → manage
- Member flow: browse → apply → track → notifications
- Admin flow: review → approve/reject → monitor
- Payment system: Stripe TEST mode working
- Mobile app: Quick Apply fully functional
- Notifications: Bell icon with dropdown
- Automation: Daily job expiration cron

🎯 **Ready for beta testing with family/friends**

## Testing Information

**Web:** Visit https://iopps.ca and create accounts
**Mobile:** Download Expo Go → Scan QR code (Nathan provides)
**Test Cards:** 4242 4242 4242 4242 (any CVV, future expiry)
**Test Data:** Do not use real sensitive information

---

## When Working on This Project:

1. **Check Firebase first** - All data is in Firestore collections
2. **Use existing functions** - Most CRUD operations exist in `firestore.ts`
3. **Follow dark theme** - Slate-900 bg, #14B8A6 accent
4. **TypeScript strict** - All code is typed, import from `types.ts`
5. **Test with Stripe TEST cards** - Never use real card numbers
6. **Mobile-first responsive** - Design for mobile, scale up
7. **Error handling** - Always wrap async operations in try-catch
8. **Loading states** - Show spinners during async operations
9. **Notifications** - Use existing `createNotification()` function
10. **Admin approval** - Remember employers need approval before posting

## Key URLs

- Production: https://iopps.ca
- Firebase Console: https://console.firebase.google.com/project/iopps-c2224
- Stripe Dashboard: https://dashboard.stripe.com/test/dashboard
- GitHub: (Nathan's private repo with auto-deploy)

---

**Last Updated:** November 29, 2025
**Project Version:** 1.0 Beta Ready
