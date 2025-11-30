# IOPPS Testing Guide

## For Testers: How to Test the IOPPS Mobile App

### Quick Testing with Expo Go (Easiest Method)

**What testers need:**
1. Download "Expo Go" app from App Store (iOS) or Google Play (Android)
2. Have the QR code ready (provided by Nathan)

**Testing Steps:**
1. Open Expo Go app
2. Scan the QR code with your camera (iOS) or within Expo Go (Android)
3. App will load automatically
4. Start testing!

---

## Web App Testing

**URL:** https://iopps.ca

**Test Scenarios:**

### Scenario 1: Employer Creates Job Posting
1. Visit https://iopps.ca
2. Sign up as an employer
3. Complete employer profile setup
4. Navigate to "Post a Job"
5. Fill out job details
6. Complete payment (TEST MODE - no real charges!)
7. View your posted job

### Scenario 2: Job Seeker Browses Jobs
1. Open mobile app (Expo Go)
2. Browse job listings
3. Tap on a job to view details
4. Try "Quick Apply" if enabled

### Scenario 3: Cross-Platform Sync
1. Create a job on web
2. Open mobile app
3. Pull down to refresh
4. Your job should appear!

---

## What to Report

Please report:
- ✅ What worked well
- ❌ Any errors or crashes
- 🐛 Visual bugs or layout issues
- 💡 Suggestions for improvement

---

## Important Notes

⚠️ **This is TEST mode:**
- No real payments will be charged
- Data may be reset during testing
- Some features may be incomplete

🔒 **Privacy:**
- Test data is stored securely
- Do not use real sensitive information

---

## Test Credit Cards (Stripe Test Mode)

**Success:** 4242 4242 4242 4242  
**Decline:** 4000 0000 0000 0002  
**3D Secure:** 4000 0027 6000 3184  

**CVV:** Any 3 digits  
**Expiry:** Any future date  
**ZIP:** Any 5 digits  

