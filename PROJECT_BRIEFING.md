# IOPPS Project Briefing
**Indigenous Opportunities & Partnerships Platform**

## 🎯 Project Overview

**Mission:** Empowering Indigenous success across Canada through jobs, conferences, scholarships, pow wows, Indigenous-owned businesses, and live streams. Supporting economic reconciliation and TRC Call to Action 92.

**Website:** https://iopps.ca
**Status:** In active development, ready for beta testing
**Owner:** Nathan Arias (nathan.arias@iopps.ca)

---

## 📱 Platform Architecture

### Two-Platform System
1. **Web Application** (Next.js)
   - Main platform at https://iopps.ca
   - Full-featured employer and member dashboards
   - Payment processing, job posting, applications
   - Admin panel for moderation

2. **Mobile Application** (React Native + Expo)
   - Native iOS and Android app
   - Job browsing and Quick Apply feature
   - Real-time sync with web platform
   - Testing via Expo Go

---

## 🛠 Technology Stack

### Frontend
- **Web:** Next.js 14 (App Router), React, TypeScript
- **Mobile:** React Native, Expo
- **Styling:** Tailwind CSS (dark theme: slate-900 bg, #14B8A6 teal accent)

### Backend & Services
- **Database:** Firebase Firestore (NoSQL)
- **Authentication:** Firebase Auth
- **Storage:** Firebase Cloud Storage
- **Payments:** Stripe (currently in TEST mode)
- **Email:** Resend API
- **Hosting:** Vercel (web), Expo (mobile)

### Infrastructure
- **CI/CD:** Auto-deployment via Vercel (push to GitHub triggers deploy)
- **Cron Jobs:** Vercel Cron (job expiration, email alerts)
- **Project ID:** iopps-c2224

---

## 👥 User Roles & Features

### 1. Community Members (Job Seekers)
**Access:** Free sign-up

**Features:**
- Browse jobs, conferences, scholarships, pow wows, shop
- Save jobs for later
- Quick Apply to jobs (with or without resume)
- Track all applications in dashboard
- View application status (submitted, reviewed, shortlisted, hired, rejected)
- Withdraw pending applications
- Receive notifications (new jobs, application updates)
- Build profile with work experience, education, skills
- Direct messaging with employers

**Key Pages:**
- `/member/dashboard` - Main dashboard
- `/member/profile` - Profile management
- `/member/applications` - Track all applications
- `/jobs` - Browse all jobs
- `/saved` - Saved jobs

### 2. Employers
**Access:** Sign-up + Admin approval required

**Approval Workflow:**
1. Employer creates account and profile
2. Status: "pending" until admin reviews
3. Admin approves/rejects via `/admin/employers`
4. Once approved, can post jobs

**Features:**
- Post job listings (paid - various tiers)
- Manage active/expired jobs
- View job analytics (views, applications count)
- Review applications and applicants
- Update application status
- Message candidates
- Subscription management (credits, expiration)
- Company profile with logo, description, website

**Subscription Tiers:**
- **TIER1:** Basic job posting
- **TIER2:** Enhanced posting with more credits
- **TIER3:** Premium with unlimited posts + featured listings

**Key Pages:**
- `/employer/dashboard` - Main dashboard
- `/employer/jobs/new` - Create job posting
- `/employer/jobs` - Manage all jobs
- `/employer/jobs/[jobId]` - View job details & applications
- `/employer/subscription` - Manage subscription & credits
- `/employer/profile` - Company profile

### 3. Admins & Moderators
**Access:** Super admin email configured in env vars

**Features:**
- Approve/reject pending employer accounts
- View all employers with filtering
- Moderate content across platform
- Access admin panel at `/admin`

**Key Pages:**
- `/admin/employers` - Employer approval panel
- `/admin` - Admin dashboard

---

## 💰 Payment System (Stripe)

### Stripe Account Details

**Dashboard:** https://dashboard.stripe.com/test/dashboard
**Current Mode:** TEST MODE (no real charges)
**API Version:** 2025-11-17.clover
**Configuration File:** `web/lib/stripe.ts`

**Stripe Keys (TEST Mode):**
```
Secret Key: sk_test_REDACTED
Publishable Key: pk_test_51Kaumz4KL7oAnlGUQvaIXZkwGJLju9ASq27AlOfFdJo2hDIgyQjmAaiGsSBw6FlSfZFO7tkKlSSm7LTmnSQOgCfz00gC1hyCdN
Webhook Secret: whsec_WXXQP4yazHZBaIkya1IbVXzQiGELyeah
```

**Test Cards:**
- ✅ Success: 4242 4242 4242 4242
- ❌ Decline: 4000 0000 0000 0002
- 🔒 3D Secure: 4000 0027 6000 3184
- CVV: Any 3 digits
- Expiry: Any future date
- ZIP: Any 5 digits

### Product Catalog & Pricing

All prices in CAD. Configured in `web/lib/stripe.ts`.

#### 1. Job Posting Products (Single Posts)

**SINGLE Job Post**
- Price: $125.00 CAD
- Duration: 30 days
- Job Credits: 1
- Featured: No
- Description: 1 job posting live for 30 days with standard placement

**FEATURED Job Ad**
- Price: $300.00 CAD
- Duration: 45 days
- Job Credits: 1
- Featured: Yes
- Description: Posted for 45 days with "Featured" spotlight placement, employer logo & branding, and analytics

#### 2. Employer Subscription Tiers (Annual Plans)

**TIER 1 – Basic Visibility**
- Price: $1,250.00 CAD/year
- Duration: 365 days
- Job Credits: 15 per year
- Featured Job Credits: 15 included
- Unlimited Posts: No
- Features:
  - 15 job postings per year
  - Standard placement
  - Basic employer profile page
  - Access to posting analytics
  - 15 Featured Job Listings included

**TIER 2 – Unlimited Basic**
- Price: $2,500.00 CAD/year
- Duration: 365 days
- Job Credits: Unlimited
- Featured Job Credits: 5 rotating featured
- Unlimited Posts: Yes
- Features:
  - Unlimited job postings for 12 months
  - Employer branding on postings
  - Rotating featured listings on homepage & job board
  - Candidate engagement analytics
  - Standard customer support
  - Rotating Featured Jobs included

**TIER 3 – Unlimited Pro**
- Price: $3,750.00 CAD/year
- Duration: 365 days
- Job Credits: Unlimited
- Featured Job Credits: Unlimited
- Unlimited Posts: Yes
- Premium Employer: Yes
- Features:
  - Unlimited job postings (12 months)
  - Featured Employer status across IOPPS.ca
  - Premium branding + credibility boosts
  - Priority customer support
  - Full access to the candidate database
  - Rotating Featured Jobs
  - Monthly Podcast Feature (live or pre-recorded)

#### 3. Conference/Event Products

**STANDARD Conference Posting**
- Price: $250.00 CAD
- Duration: 90 days
- Featured: No
- Description: Upload any conference, summit, gathering, hiring event, or training with banner image and registration link

**FEATURED Conference Spotlight**
- Price: $400.00 CAD
- Duration: 120 days
- Featured: Yes
- Description: Premium spotlight placement with featured badge and top positioning for 120 days

#### 4. Shop Indigenous Vendor Products

**MONTHLY Vendor Listing**
- Price: $50.00 CAD/month
- Duration: 30 days
- Featured: No
- Recurring: Yes
- First Month: FREE
- Features:
  - Your Indigenous-owned business listed in Shop Indigenous
  - Products, services, images, descriptions
  - Direct contact links & social links
  - FIRST MONTH FREE
  - Renews monthly at $50/month

**ANNUAL Vendor Plan**
- Price: $400.00 CAD/year (Save $200)
- Duration: 365 days
- Featured: Yes
- Recurring: No
- Features:
  - Save $200 vs monthly
  - Includes all features above
  - Priority placement inside the Shop Indigenous marketplace
  - Annual discounted rate

### Webhook Configuration

**Webhook Endpoint:** `https://iopps.ca/api/stripe/webhook`
**Events Monitored:**
- `checkout.session.completed` - Payment successful
- `payment_intent.succeeded` - Payment processed
- `payment_intent.payment_failed` - Payment failed

**Webhook Flow:**
1. User completes payment on Stripe Checkout
2. Stripe sends webhook to `/api/stripe/webhook`
3. Webhook verified with secret
4. Creates/updates subscription or job posting in Firestore
5. Sends confirmation notification to user

### Payment Flow

**Job Posting Payment:**
1. Employer goes to `/employer/jobs/new`
2. Fills out job details
3. Selects posting type (SINGLE or FEATURED)
4. Clicks "Continue to Payment"
5. Redirected to Stripe Checkout
6. Completes payment (TEST cards work)
7. Webhook creates job posting in Firestore
8. Redirected back to success page
9. Job goes live immediately

**Subscription Payment:**
1. Employer visits `/pricing`
2. Selects tier (TIER1, TIER2, or TIER3)
3. Clicks "Subscribe"
4. Redirected to Stripe Checkout
5. Completes payment
6. Webhook updates employer profile with subscription
7. Job credits added to account
8. Can now post jobs using credits

### Important Notes

- **TEST MODE:** All transactions are simulated - no real money charged
- **Credits System:** Subscription tiers include job credits that are consumed when posting
- **Unlimited:** TIER2 and TIER3 have unlimited basic posts (credits set to -1)
- **Featured Credits:** Separate counter for featured job upgrades
- **Expiration:** Subscriptions expire after 365 days
- **Auto-renewal:** Not currently implemented (manual renewal required)

---

## 🎨 Design System

**Theme:**
- Background: Dark mode (slate-900: #0F172A)
- Primary accent: Teal (#14B8A6)
- Text: Slate shades (100-500)
- Borders: Slate-800/700
- Consistent card-based layouts
- Responsive design (mobile-first)

**Brand:**
- Logo: `/logo.png`
- Tagline: "Empowering Indigenous Success"
- Professional, modern, accessible

---

## 🔥 Recent Development (Last Session)

We completed a comprehensive audit and implemented **7 critical missing features** to make the job posting pillar 100% complete:

### ✅ Completed Features

1. **Duplicate Application Prevention**
   - Function: `checkExistingApplication()` in `web/lib/firestore.ts`
   - Prevents users from applying to same job twice
   - Implemented in both web and mobile

2. **Mobile Quick Apply**
   - File: `mobile/src/screens/QuickApplyScreen.tsx`
   - Fully functional application submission from mobile app
   - Includes duplicate checking, cover letter, employer notification

3. **Member Applications Dashboard**
   - File: `web/app/member/applications/page.tsx`
   - Comprehensive tracking of all job applications
   - Stats dashboard, filtering, status badges
   - Withdraw application functionality

4. **Employer Subscription Dashboard**
   - File: `web/app/employer/subscription/page.tsx`
   - Shows tier, credits remaining, expiration
   - Progress bars for job credits and featured credits
   - Action cards for managing account

5. **Job Expiration Automation**
   - File: `web/app/api/cron/expire-jobs/route.ts`
   - Vercel Cron runs daily at midnight
   - Auto-deactivates expired jobs based on `expiresAt` or `closingDate`
   - Configured in `vercel.json`

6. **Admin Employer Approval Panel**
   - File: `web/app/admin/employers/page.tsx`
   - Review pending employer applications
   - Approve/reject with reasons
   - Filter, search, sort employers
   - View company details, logo, website

7. **Notification System (Bell Icon)**
   - File: `web/components/NotificationBell.tsx`
   - Bell icon in header with unread count badge
   - Dropdown showing recent notifications
   - Mark as read, mark all as read
   - Different icons for notification types
   - Notifications created on:
     - New job application (to employer)
     - Application status change (to member)
     - Employer approval/rejection
     - New messages

---

## 📊 Complete User Flows

### Employer Job Posting Flow
```
1. Sign up → Create account (role: employer)
2. Complete employer profile (company name, logo, description, website)
3. Status: "pending" → Wait for admin approval
4. Admin reviews at /admin/employers → Approves
5. Status: "approved" → Can now post jobs
6. Go to /employer/jobs/new
7. Fill job details (title, description, location, salary, etc.)
8. Choose posting duration (30/60/90 days)
9. Enable Quick Apply (optional)
10. Pay with Stripe (TEST mode)
11. Job goes live at /jobs
12. View applicants at /employer/jobs/[jobId]
13. Update application status (reviewed, shortlisted, hired, rejected)
14. Receive notifications when candidates apply
```

### Member Job Application Flow
```
1. Sign up → Create account (role: community)
2. Build profile at /member/profile
3. Browse jobs at /jobs
4. Click job → View details at /jobs/[jobId]
5. Click "Quick Apply" (if enabled) or "Apply"
6. Submit cover letter (and resume if required)
7. Application saved to Firestore
8. Track application at /member/applications
9. Receive notifications on status changes
10. Can withdraw if status is submitted/reviewed
```

### Admin Approval Flow
```
1. New employer signs up
2. Employer profile status: "pending"
3. Admin logs in, goes to /admin/employers
4. Sees pending employers list
5. Reviews: company name, website, description, logo
6. Clicks "Approve" or "Reject"
7. If reject: enters rejection reason
8. Employer receives notification
9. If approved: employer can post jobs
```

---

## 🗂 Key Files & Directories

### Configuration
- `.env.local` - All environment variables (Firebase, Stripe, etc.)
- `.firebaserc` - Firebase project ID
- `vercel.json` - Cron jobs configuration
- `firebase.json` - Firebase emulator settings
- `service-account.json` - Firebase Admin SDK credentials

### Web Application
```
web/
├── app/
│   ├── employer/          # Employer dashboard & features
│   │   ├── dashboard/
│   │   ├── jobs/
│   │   ├── subscription/
│   │   └── profile/
│   ├── member/            # Member/community features
│   │   ├── dashboard/
│   │   ├── applications/
│   │   └── profile/
│   ├── admin/             # Admin panel
│   │   └── employers/
│   ├── jobs/              # Public job listings
│   ├── api/               # API routes
│   │   ├── stripe/        # Stripe webhooks & checkout
│   │   └── cron/          # Cron endpoints
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── SiteHeader.tsx
│   ├── NotificationBell.tsx
│   └── ...
└── lib/
    ├── firebase.ts        # Firebase client config
    ├── firestore.ts       # All Firestore functions (CRITICAL FILE)
    ├── stripe.ts          # Stripe configuration
    └── types.ts           # TypeScript types
```

### Mobile Application
```
mobile/
├── src/
│   ├── screens/
│   │   ├── QuickApplyScreen.tsx
│   │   ├── JobsScreen.tsx
│   │   └── ...
│   ├── lib/
│   │   └── firebase.ts
│   └── context/
│       └── AuthContext.tsx
├── App.tsx
└── app.json              # Expo configuration
```

### Important Functions (web/lib/firestore.ts)
- `createJobPosting()` - Create new job
- `createJobApplication()` - Apply to job
- `checkExistingApplication()` - Check for duplicates
- `listMemberApplications()` - Get user's applications
- `updateApplicationStatus()` - Change application status
- `listEmployers()` - Get all employers (with optional status filter)
- `updateEmployerStatus()` - Approve/reject employer
- `getUserNotifications()` - Get user's notifications
- `markNotificationAsRead()` - Mark notification as read

---

## 🔐 Access & Credentials

### Firebase
- **Project:** iopps-c2224
- **Console:** https://console.firebase.google.com/project/iopps-c2224
- **Admin Email:** nathan.arias@iopps.ca

### Stripe
- **Dashboard:** https://dashboard.stripe.com/test/dashboard
- **Mode:** TEST (no real charges)
- **Keys:** In `.env.local`

### Vercel
- **Project:** iopps (auto-deploys from GitHub)
- **Domain:** https://iopps.ca

### GitHub
- **Repository:** (Nathan's private repo)
- **Auto-deploy:** Push to main → Vercel builds & deploys

---

## 🧪 Testing Status

### Current State
- ✅ All 7 critical features implemented
- ✅ Stripe in TEST mode (safe for testing)
- ✅ Firebase production database active
- ✅ Vercel cron jobs scheduled
- ⏳ Ready for beta testing with family/friends

### How to Test

**Web:**
1. Visit https://iopps.ca
2. Create employer or community account
3. Test job posting flow (use test card: 4242 4242 4242 4242)
4. Test application flow
5. Test notifications, dashboards, etc.

**Mobile:**
1. Download "Expo Go" app
2. Scan QR code (Nathan provides)
3. App loads in Expo Go
4. Test job browsing and Quick Apply

**Test Accounts:**
- Create fresh accounts for testing
- Do NOT use real sensitive information
- Data may be reset during testing phase

### Testing Guide
See `TESTING_GUIDE.md` for complete testing instructions

---

## 📅 Scheduled Tasks (Vercel Cron)

Configured in `vercel.json`:

1. **Daily Job Alerts** - 9:00 AM daily
   - Path: `/api/emails/send-job-alerts/daily`
   - Sends matching jobs to members who opted in

2. **Weekly Job Alerts** - 9:00 AM Mondays
   - Path: `/api/emails/send-job-alerts/weekly`
   - Weekly digest of new jobs

3. **Expire Jobs** - Midnight daily
   - Path: `/api/cron/expire-jobs`
   - Auto-deactivates expired job listings

---

## 🚀 Deployment Process

### Current Setup
1. **Auto-Deploy:** Push to GitHub → Vercel auto-builds → Live at iopps.ca
2. **No manual steps required** for deployment
3. Build time: ~2-3 minutes
4. Zero downtime deployments

### To Deploy Changes
```bash
# 1. Commit your changes
git add .
git commit -m "Description of changes"

# 2. Push to GitHub (triggers Vercel deploy)
git push origin main

# 3. Monitor at Vercel dashboard
# Deployment completes automatically
```

---

## 🐛 Known Considerations

### Environment
- **Emulators:** Currently disabled (`NEXT_PUBLIC_USE_EMULATORS=false`)
- **Database:** Using production Firebase
- **Payments:** Stripe TEST mode (no real charges)

### Future Enhancements (Not Critical)
- Email verification for new accounts
- Resume upload and parsing
- Advanced search filters
- Salary range filtering
- Company reviews/ratings
- Job recommendations based on profile

---

## 📞 Key Contacts

**Project Owner:** Nathan Arias
**Email:** nathan.arias@iopps.ca
**Super Admin:** nathan.arias@iopps.ca

---

## 🎯 Current Project Status

**Phase:** Beta Testing Ready
**Completion:** Job pillar 100% complete
**Next Steps:**
1. Post on Facebook for family/friends testing
2. Gather feedback
3. Fix any bugs discovered
4. Prepare for public launch

**Platform Readiness:**
- ✅ Web app fully functional
- ✅ Mobile app fully functional
- ✅ Payment system working (TEST mode)
- ✅ Admin approval workflow complete
- ✅ Notification system active
- ✅ Automated job expiration
- ✅ Application tracking complete
- ✅ Employer subscription management

---

## 💡 Development Tips

### Running Locally

**Web:**
```bash
cd web
npm run dev
# Runs on http://localhost:3000
```

**Mobile:**
```bash
cd mobile
npx expo start
# Scan QR code with Expo Go app
```

**Firebase Emulators:**
```bash
firebase emulators:start --only firestore,auth,storage
# Runs on localhost:8080 (UI), 9099 (auth), 8081 (firestore)
```

### Important Environment Variables
All in `web/.env.local`:
- Firebase config (API key, project ID, etc.)
- Stripe keys (test mode)
- Admin email
- Cron secret
- Resend API key

### Code Style
- TypeScript throughout
- Functional components with hooks
- Dark theme with teal accents
- Mobile-first responsive design
- Error handling on all async operations
- Loading states for better UX

---

## 📚 Additional Resources

- **Testing Guide:** `TESTING_GUIDE.md`
- **Firebase Console:** https://console.firebase.google.com/project/iopps-c2224
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Vercel Dashboard:** (Nathan has access)
- **Expo Dashboard:** (Nathan has access)

---

**Last Updated:** November 29, 2025
**Version:** 1.0 Beta Ready
