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
   - **Value**: Copy the entire block below (including quotes):

```
"-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDqo9QhWqMkMJRD
AQfpyAKVPxhBAA0ZWtwOc/IGX7BYKzv95ja5PQD6bCQsz0ed60pXUYxBNenkAd0u
u3nAKefjkpC5/oEMLzAAysRj3Ii6Z2cQ2YrlS8xIVgxfW6zvP3FqrjCPvryV+aN/
0He5OKCUUkCTUNXAv90oAbLla4N0ST5/1KbRHLgPTxIpJgnh1t8BaTZsINg/B1VL
JRmOpSVQzfsy4KvC9e/glIJtOx/KqP9vEP7GUYNXAe+4HaXoOsjGMcZOasgCxFhf
07pXvvf+JoSSNAGuUObcA2EonfLoLiPfmWm9ddBpVTCYUso1pQ0HnPGZTjZJ7IXW
yjQdC02rAgMBAAECggEAGF/ccXqQ5/mD7VH2GHsGiap8QoRW2ANwSLASvEbEcuRK
3x1DIgsMRvdk6qK9tdHzbw6xmzSWj3ECIRConSW9SQ64qhmeHj3opqxpqlYGfhav
xjhTDW7KUdlef6luVYwppANkWApgXNQKAAUP6tXPGJlSy/rhuZw0xSsoAl0g0rt2
KTgtXgKKeBhueuakF/s5/KqGWjOW5MXjrWr4DvU3zJFXRIgaUWdqaLpA10UQ1zPI
odrYN2mZZhkkEARBlcfxowye1FnrHKVA6A0XzIOQBe1S2fz8lWZ61vwxw3jNVoJa
3iQJ84/j7Nt5agt2luId4YWrJcpHVYTI2yS1WZTJAQKBgQD8hlX6IP2Er5H6gUAD
r/QgcY0zKNm/k5uv8wz5I0jn2BduC5AXow+OIq6SRR3JJ375lNSceeS8IswGIUi6
RFqaIfSuLTBiV9B9u95VOBs8VhT14hH/xXEfXyQNsWn/EAGD31bqSVvnZmcBeWrX
l9VxfrJkKG5IgnT/pfNe/dstWwKBgQDt3nu4L/mUcMbFtPExQ6jplWfIH7Un/3iQ
doc5nbM5fmLHStXi4iqGb89RQ952XTMNwz4cbD5rw+iFEigwJq0Qcl4dNQ3lRULC
+hGtj7hRtgGVogARdnJFU7IsrA0dr0YkpSbRl9RwgP9lXLEslkOLwVZfSPZMPr0T
R34SQMzB8QKBgQDGF1NGna6B8YAf9FgVDGgDM1BCe58kq1QL2CurHETKqjbm+mcU
Q7OmGgq7b0CIVVVDz75g6TXHZ7yIan+0rn4sPsrD/2rfGmfQ2hj03Mhwsk5K/AaG
j4nHxEhx/WRa02F84yw5KUbQ5QGUpHxtlwu2tl6WNykb9Ep3aOTa9WSD1QKBgCYB
QRUpnR/JcQjPoyWy4L8JXv6Lil8soy+5sFtVRfhuqAudelT4u8ClBqO+S0HwHCMb
ycWyybpgH7t7Li6bT1VsYHscKe8yxLrwR3jKmLF9ef1VV9tyaEmJWNNoXeQbSAK8
3Fnqf0fGZIfmamxsSbh/mHQ67Rc7guwcpRj3f3+RAoGBAJBiTj8DsjOSHWHHUGiu
aG0gVYcG4DuM7Ar80YDBlY9ZL423YqonooLjaW+4seHZ2xlAVLzLCSwi++YBrkpd
k57OCHeNNchYLTGV0xhwphKB3ZzodxgZTREk1Qh5OBSkYHdo42CUYw4pVqx17gUC
82Bw4qGKsbjL8EZ4oepTOpjK
-----END PRIVATE KEY-----
"
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
