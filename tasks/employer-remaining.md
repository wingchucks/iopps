# Employer Remaining Tasks

## 1. Email System (Resend)
- [ ] Install resend package
- [ ] Create email utility (`lib/email.ts`) with templates
- [ ] Application notification: email employer when someone applies
- [ ] Signup confirmation: welcome email to new employer
- [ ] Wire into apply page and signup API

## 2. Checkout Verification
- [ ] Write webhook simulation script to test plan activation
- [ ] Verify subscription doc + employer plan update works

## 3. Subscription Expiry
- [ ] Build `/api/cron/check-subscriptions` route
- [ ] Expire plans past their end date
- [ ] Add to vercel.json cron schedule

## 4. Dashboard UX
- [ ] "View Public Page" link from employer dashboard
- [ ] Show org slug/URL somewhere visible

## 5. Signup Confirmation Email
- [ ] Send welcome email via Resend after employer signup
