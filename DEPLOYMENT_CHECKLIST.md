# 🚀 IOPPS Production Deployment Checklist

## ✅ Pre-Deployment (Do First)

### 1. Environment Variables
- [ ] Copy `.env.example` to `.env.local` for local development
- [ ] Fill in all required environment variables in `.env.local`
- [ ] Verify Firebase credentials work locally
- [ ] Test Stripe payments in test mode locally
- [ ] Document which variables are production vs development

### 2. Firebase Security Rules
- [ ] Deploy Firestore rules: `firebase deploy --only firestore:rules`
- [ ] Deploy Storage rules: `firebase deploy --only storage:rules`
- [ ] Test rules with Firebase Emulator Suite (optional but recommended)
- [ ] Verify admin-only collections are protected
- [ ] Verify public read access works for jobs, conferences, etc.

### 3. Stripe Configuration
- [ ] Create production Stripe account (or switch from test mode)
- [ ] Configure webhook endpoint: `https://iopps.ca/api/stripe/webhook`
- [ ] Subscribe to events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`
- [ ] Copy production webhook signing secret to environment variables
- [ ] Test webhook delivery in Stripe Dashboard

### 4. Code Review & Testing
- [ ] All features work in development environment
- [ ] Job scraper tested with real RSS feed
- [ ] Payment flows tested (jobs and conferences)
- [ ] Admin features tested (user management, content moderation, settings)
- [ ] Mobile app landing page working
- [ ] SEO tags present (check view-source)
- [ ] Error pages (404, 500) display correctly

---

## 🌐 Deployment Steps

### Option A: Vercel (Recommended)

1. **Connect Repository**
   ```bash
   # Push your code to GitHub
   git add .
   git commit -m "Ready for production deployment"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure project:
     - Framework Preset: Next.js
     - Root Directory: ./web
     - Build Command: `npm run build`
     - Output Directory: .next

3. **Add Environment Variables**
   - Go to Project Settings > Environment Variables
   - Add ALL variables from `.env.example`:
     - `NEXT_PUBLIC_FIREBASE_API_KEY`
     - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
     - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
     - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
     - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
     - `NEXT_PUBLIC_FIREBASE_APP_ID`
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_CLIENT_EMAIL`
     - `FIREBASE_PRIVATE_KEY` (⚠️ Paste the FULL key including quotes and \n)
     - `STRIPE_SECRET_KEY` (use `sk_live_...` for production)
     - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (use `pk_live_...`)
     - `STRIPE_WEBHOOK_SECRET`
     - `NEXT_PUBLIC_SITE_URL=https://iopps.ca`
   - Set environment: Production

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Visit your deployment URL

5. **Configure Custom Domain**
   - Go to Project Settings > Domains
   - Add `iopps.ca` and `www.iopps.ca`
   - Follow DNS configuration instructions
   - Wait for SSL certificate to provision (automatic)

### Option B: Other Platforms

#### Netlify
Similar to Vercel, but use these settings:
- Build command: `npm run build`
- Publish directory: `.next`
- Add environment variables in Build & Deploy settings

#### Self-Hosted (VPS/Cloud)
```bash
# Build the production bundle
npm run build

# Start production server
npm start

# Or use PM2 for process management
pm2 start npm --name "iopps" -- start
pm2 save
pm2 startup
```

---

## ✅ Post-Deployment (Immediately After)

### 1. Smoke Test - Critical Paths
- [ ] **Homepage loads**: Visit https://iopps.ca
- [ ] **Authentication works**: Sign up → Log in → Log out
- [ ] **Jobs page works**: Browse jobs, view details
- [ ] **Payment flow works**: Post a job (use test card in production test mode first!)
- [ ] **Admin panel accessible**: Log in as admin, access /admin
- [ ] **RSS feed scraper works**: Add feed, sync jobs

### 2. Verify Integrations
- [ ] **Firebase**: Check Firebase Console for new user signups
- [ ] **Stripe**: Verify webhook events appear in Stripe Dashboard
- [ ] **Storage**: Upload a test image (profile picture or logo)
- [ ] **Firestore**: Verify security rules are active (try unauthorized access)

### 3. Configure External Services

#### Google Search Console
- [ ] Add property: https://iopps.ca
- [ ] Verify ownership (use HTML tag method)
- [ ] Submit sitemap: https://iopps.ca/sitemap.xml
- [ ] Request indexing for homepage

#### Google Analytics (Optional)
- [ ] Create GA4 property
- [ ] Add measurement ID to environment variables
- [ ] Verify tracking works

#### Social Media
- [ ] Test OpenGraph tags (share on Facebook/Twitter)
- [ ] Verify preview images display correctly
- [ ] Add website URL to social media profiles

---

## 🔒 Security Checklist

### Firebase
- [x] Firestore rules deployed and restrictive
- [x] Storage rules deployed with file size limits
- [ ] Firebase Authentication email verification enabled
- [ ] Firebase console access limited to admins only
- [ ] Billing alerts configured

### Environment Variables
- [x] `.env.local` in `.gitignore`
- [ ] No sensitive data committed to Git repository
- [ ] Production keys are different from development keys
- [ ] Webhook secrets are configured correctly

### Application Security
- [ ] Admin impersonation restricted to nathan.arias@iopps.ca ✓
- [ ] Role-based access control working (admin, moderator, employer, member)
- [ ] HTTPS enforced (automatic with Vercel)
- [ ] CORS configured if using external APIs

---

## 📊 Monitoring & Maintenance

### Day 1-7 (First Week)
- [ ] Monitor error logs daily
- [ ] Check Firebase usage/quota
- [ ] Verify Stripe payments processing correctly
- [ ] Respond to user feedback
- [ ] Fix any critical bugs immediately

### Ongoing
- [ ] Set up uptime monitoring (e.g., UptimeRobot, Pingdom)
- [ ] Configure error tracking (e.g., Sentry)
- [ ] Monitor Core Web Vitals (PageSpeed Insights)
- [ ] Review Firebase costs monthly
- [ ] Update dependencies quarterly: `npm outdated`

---

## 🆘 Rollback Plan

If critical issues occur:

1. **Quick Fix**: Redeploy previous working version
   ```bash
   # In Vercel dashboard
   Go to Deployments → Find last working deployment → Promote to Production
   ```

2. **Emergency Maintenance Mode**:
   - Log in to /admin/settings
   - Enable "Maintenance Mode"
   - Users will see maintenance message instead of site

3. **Database Rollback**:
   - Contact is difficult - use Firebase export/import
   - Prevention: Enable daily Firestore backups

---

## 📞 Support Contacts

- **Firebase Support**: https://firebase.google.com/support
- **Stripe Support**: https://support.stripe.com
- **Vercel Support**: support@vercel.com
- **Domain Registrar**: (Your DNS provider)

---

## 🎉 Launch Checklist

When you're ready to announce:

- [ ] All critical features tested and working
- [ ] Sitemap submitted to Google
- [ ] Social media posts prepared
- [ ] Email announcement ready (if you have a mailing list)
- [ ] Press release (if applicable)
- [ ] Monitor traffic and server load

---

## 📝 Notes

**Current Status**:
- ✅ Development complete
- ✅ SEO optimized
- ✅ Job scraper functional
- ⏳ Awaiting deployment

**Estimated Deployment Time**: 2-3 hours
**Recommended Launch Time**: Weekday morning (9-11 AM) for monitoring

---

**Good luck with your launch! 🚀🎉**
