# Bulk Delete Firebase Auth Users by Creation Date

Safely identifies and deletes Firebase Auth users created on a specific date (Dec 11, 2025 in America/Regina timezone).

## Safety Features

- **Default mode is DRY_RUN=true** - no deletions occur
- Produces CSV logs before any deletion
- Firestore deletions continue even if individual docs fail
- Chunked Auth deletion (max 1000 per batch)
- Full audit trail with timestamped CSV files

## Prerequisites

```bash
# From project root - ensure firebase-admin is installed
cd web && npm install
```

## Authentication

### Option A: Service Account JSON File (Recommended)

1. Download service account key from Firebase Console:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the JSON file securely

2. Run with the file path:
```bash
cd C:\Users\natha\OneDrive\Documents\iopps
GOOGLE_APPLICATION_CREDENTIALS="./path/to/service-account.json" node scripts/bulk_delete_users_by_date.js
```

### Option B: gcloud Application Default Credentials

```bash
# Login with gcloud (one-time setup)
gcloud auth application-default login

# Then run the script
cd C:\Users\natha\OneDrive\Documents\iopps
node scripts/bulk_delete_users_by_date.js
```

### Option C: Environment Variables (from .env)

If your web/.env.local has Firebase Admin credentials:

```bash
# Load from existing .env.local
cd C:\Users\natha\OneDrive\Documents\iopps\web
source <(grep -E '^FIREBASE_' .env.local | sed 's/^/export /')
cd ..
node scripts/bulk_delete_users_by_date.js
```

Or set directly:
```bash
export FIREBASE_PROJECT_ID="your-project-id"
export FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
node scripts/bulk_delete_users_by_date.js
```

## Usage

### Step 1: Dry Run (Default - SAFE)

```bash
cd C:\Users\natha\OneDrive\Documents\iopps

# Using service account file
GOOGLE_APPLICATION_CREDENTIALS="./service-account.json" node scripts/bulk_delete_users_by_date.js

# Or using gcloud credentials
node scripts/bulk_delete_users_by_date.js
```

This will:
- List all Firebase Auth users
- Filter users created on Dec 11, 2025 (America/Regina time)
- Write `scripts/output/candidates_<timestamp>.csv`
- Check Firestore for matching profile docs
- Write `scripts/output/firestore_<timestamp>.csv`
- Print summary (NO deletions)

### Step 2: Review the CSVs

```bash
# View first 20 lines of candidates
head -20 scripts/output/candidates_*.csv

# Check how many users would be deleted
wc -l scripts/output/candidates_*.csv
```

### Step 3: Execute Deletion (DESTRUCTIVE)

Only run this after reviewing the dry run output:

```bash
DRY_RUN=false GOOGLE_APPLICATION_CREDENTIALS="./service-account.json" node scripts/bulk_delete_users_by_date.js
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DRY_RUN` | `true` | Set to `false` to actually delete |
| `PROFILE_COLLECTION` | `memberProfiles` | Firestore collection for user profiles |
| `DELETE_SUBCOLLECTIONS` | `false` | Reserved for future use |

## Output Files

All outputs are written to `scripts/output/`:

### candidates_<timestamp>.csv
```csv
uid,email,creationTimeUTC,lastSignInTimeUTC,disabled
abc123,user@example.com,2025-12-11T12:34:56Z,2025-12-11T12:35:00Z,false
```

### firestore_<timestamp>.csv
```csv
uid,firestoreProfileExists,deletedProfileDoc,errorIfAny
abc123,true,false,
def456,false,false,
ghi789,unknown,false,Permission denied
```

## Target Date Configuration

The script is configured for:
- **Local Time**: Dec 11, 2025 00:00:00 to Dec 12, 2025 00:00:00
- **Timezone**: America/Regina (CST, UTC-6, no DST)
- **UTC Equivalent**: Dec 11, 2025 06:00:00Z to Dec 12, 2025 06:00:00Z

To change the date, edit these lines in the script:
```javascript
const TARGET_START_UTC = new Date('2025-12-11T06:00:00.000Z');
const TARGET_END_UTC = new Date('2025-12-12T06:00:00.000Z');
```

## Troubleshooting

### "No Firebase credentials found"

Ensure one of these is set:
- `GOOGLE_APPLICATION_CREDENTIALS` pointing to a valid JSON file
- `FIREBASE_SERVICE_ACCOUNT_BASE64` or `FIREBASE_SERVICE_ACCOUNT_JSON`
- Individual vars: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

### "Permission denied" errors

Your service account needs:
- Firebase Auth Admin role
- Firestore read/delete permissions on the profile collection

### Module not found: 'firebase-admin'

Run from the project root after installing dependencies:
```bash
cd C:\Users\natha\OneDrive\Documents\iopps\web
npm install
cd ..
node scripts/bulk_delete_users_by_date.js
```
