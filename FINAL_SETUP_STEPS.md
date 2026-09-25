# Final Setup Steps for Stripe Payment Integration

## ✅ What's Already Done
- Local environment configured (`.env.local`)
- All code written and deployed to Vercel
- `FIREBASE_CLIENT_EMAIL` added to Vercel
- Test payment flow works (redirects to Stripe and back)

## ⚠️ What You Need to Do (3 Quick Steps)

### Step 1: Add FIREBASE_PRIVATE_KEY to Vercel

1. Go to: https://vercel.com/wingchucks-projects/iopps/settings/environment-variables
2. In the "Create New" section:
   - **Key**: `FIREBASE_PRIVATE_KEY`
   - **Value**: Paste the `private_key` from a Firebase service account key you download from the Firebase console (Project settings → Service accounts). Never commit it to the repository:

```
<the private_key value from a newly created Firebase service account JSON — never commit it>
```

3. Click **Save**

### Step 2: Add STRIPE_WEBHOOK_SECRET to Vercel

1. Log in to Stripe: https://dashboard.stripe.com/test/webhooks
2. Click on your webhook endpoint: `https://iopps.vercel.app/api/stripe/webhook`
3. Click **"Reveal"** under "Signing secret"
4. Copy the secret (starts with `whsec_...`)
5. Go back to Vercel: https://vercel.com/wingchucks-projects/iopps/settings/environment-variables
6. Add a new variable:
   - **Key**: `STRIPE_WEBHOOK_SECRET`
   - **Value**: [paste the secret from Stripe]
7. Click **Save**

### Step 3: Redeploy on Vercel

1. Go to: https://vercel.com/wingchucks-projects/iopps
2. Click the **Deployments** tab
3. Find the latest deployment
4. Click the three dots `...` next to it
5. Click **Redeploy**
6. Wait for the deployment to complete

---

## 🎉 After Completing These Steps

Your payment integration will be fully functional:
- Employers create a job → Draft saved to Firestore
- Payment processed via Stripe
- Webhook activates the job automatically
- Job appears in the employer's dashboard

## 🧪 Testing

1. Go to: https://iopps.vercel.app/employer/jobs/new
2. Fill out the job form
3. Select a package (Single $125 or Featured $300)
4. Click "Continue to Payment"
5. Use test card: `4242 4242 4242 4242`
6. Complete payment
7. Check your dashboard - the job should now be **Active**!

---

**Need help?** Let me know if you run into any issues with these steps.
