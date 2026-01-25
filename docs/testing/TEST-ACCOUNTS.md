# IOPPS Test Accounts

## FOR TESTING ONLY - DO NOT USE IN PRODUCTION

These test accounts are designed for automated QA testing with the Claude Chrome agent. They bypass email verification and approval workflows to enable immediate testing.

---

## Community Member Account

| Field | Value |
|-------|-------|
| **Email** | `sarah.whitebear@test.iopps.ca` |
| **Password** | `TestIOPPS2025!` |
| **Name** | Sarah Whitebear |
| **Role** | Community Member (Job Seeker) |
| **Indigenous Affiliation** | Cree (Nehiyaw) - Muskeg Lake Cree Nation, Treaty 6 |
| **Location** | Saskatoon, Saskatchewan |

### Profile Features
- Complete work history (3 positions)
- Education credentials (B.Ed, M.Ed)
- Skills array (10 skills)
- Portfolio items (2 projects)
- Quick Apply enabled with default cover letter
- Bio and tagline populated

### What You Can Test
- Job searching and filtering
- Job applications (Quick Apply and standard)
- Profile editing
- Resume upload
- Saved jobs
- Job alerts
- Member messaging
- Education program browsing
- Scholarship applications

---

## Organization Account

| Field | Value |
|-------|-------|
| **Email** | `hello@northernlightsconsulting.ca` |
| **Password** | `TestIOPPS2025!` |
| **Name** | Northern Lights Indigenous Consulting |
| **Role** | Employer (Organization) |
| **Indigenous Affiliation** | Metis Nation-Saskatchewan |
| **Location** | Saskatoon, Saskatchewan |
| **Public URL** | `/organizations/northern-lights-indigenous-consulting` |

### Account Status
- **Approval Status**: Approved (bypasses admin approval)
- **Indigenous Verification**: Approved
- **Subscription**: Active Professional tier (1 year)
- **Free Posting Grant**: Enabled with 50 job credits, 10 featured credits

### Enabled Modules (All 5)
1. **Hire** - Job posting and applicant management
2. **Sell** - Shop Indigenous vendor/marketplace
3. **Educate** - Training programs and education
4. **Host** - Events and conferences
5. **Funding** - Scholarships and grants

### Certifications (Pre-populated)
- CCAB Certified Aboriginal Business
- SaskTenders Indigenous Vendor
- PSPC Indigenous Business Directory

### What You Can Test
- Job posting (standard and featured)
- Applicant management pipeline
- Team member invitations
- Organization profile editing
- Training program creation
- Event/conference creation
- Scholarship posting
- Vendor/marketplace listings
- Analytics dashboard
- Subscription management
- Indigenous verification display

---

## Running the Seed Script

### Prerequisites
1. Ensure you have the required environment variables set:
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

   Or for emulators:
   - `NEXT_PUBLIC_USE_EMULATORS=true`

2. Install dependencies if not already done:
   ```bash
   cd web
   npm install
   ```

### Run the Script

```bash
# From the web directory
npm run seed:test-accounts
```

### Expected Output

```
IOPPS Test Account Seeder
==================================================
Firebase Admin initialized

Creating Community Member: Sarah Whitebear
--------------------------------------------------
  Auth user created/found: abc123xyz
  User document created: users/abc123xyz
  Member profile created: memberProfiles/abc123xyz
  Email verified: true

Creating Organization: Northern Lights Indigenous Consulting
--------------------------------------------------
  Auth user created/found: def456uvw
  User document created: users/def456uvw
  Employer profile created: employers/def456uvw
  Approval status: approved
  Verification status: approved
  Subscription status: active (Professional)
  Enabled modules: hire, sell, educate, host, funding

==================================================
Test accounts ready!

Community Member Login:
  Email: sarah.whitebear@test.iopps.ca
  Password: TestIOPPS2025!

Organization Login:
  Email: hello@northernlightsconsulting.ca
  Password: TestIOPPS2025!
  Public URL: /organizations/northern-lights-indigenous-consulting
```

---

## Idempotency

The script is safe to run multiple times:

- **Auth Users**: Checks if user exists by email before creating. If exists, reuses the existing UID.
- **Firestore Documents**: Uses `set()` with `{ merge: true }` to update existing documents without losing data.
- **UIDs**: The Firebase Auth UID is dynamically retrieved and used for Firestore documents (not hardcoded).

---

## Firestore Collections Modified

| Collection | Document ID | Purpose |
|------------|-------------|---------|
| `users` | Firebase Auth UID | User role and basic info |
| `memberProfiles` | Firebase Auth UID | Sarah's member profile |
| `employers` | Firebase Auth UID | Northern Lights organization profile |

---

## Using with Firebase Emulators

To seed accounts in the local emulator:

1. Start the emulators:
   ```bash
   npm run emulators
   ```

2. Set the emulator flag:
   ```bash
   set NEXT_PUBLIC_USE_EMULATORS=true  # Windows
   export NEXT_PUBLIC_USE_EMULATORS=true  # Mac/Linux
   ```

3. Run the seed script:
   ```bash
   npm run seed:test-accounts
   ```

---

## Troubleshooting

### "Missing Firebase credentials" error
Ensure your `.env.local` file has the required Firebase Admin SDK credentials.

### Auth user exists but Firestore document is missing
The script will create missing Firestore documents even if the Auth user already exists.

### "Permission denied" errors
Make sure you're using service account credentials with sufficient permissions (Firebase Admin SDK).

### Emulator connection issues
Verify emulators are running on the expected ports:
- Auth: localhost:9099
- Firestore: localhost:8080

---

## Security Notes

- These accounts use a known password and should **NEVER** be created in production
- The email domains (`test.iopps.ca`, `northernlightsconsulting.ca`) are fictional test domains
- All verification and approval statuses are auto-set to bypass normal workflows
- The subscription is granted for free (no actual payment)

---

## Maintenance

If the data model changes, update the seed script at:
```
web/scripts/seed-test-accounts.ts
```

Key interfaces to review when updating:
- `MemberProfile` in `web/lib/types.ts`
- `EmployerProfile` in `web/lib/types.ts`
- `EmployerSubscription` in `web/lib/types.ts`
- `IndigenousVerification` in `web/lib/types.ts`
