# Job Alerts Cron Job Setup

This guide explains how to set up automated job alert emails using cron jobs.

## Overview

The job alerts system sends emails to users based on their alert preferences at three different frequencies:
- **Instant**: Every 15 minutes
- **Daily**: Once per day at 9 AM
- **Weekly**: Once per week on Monday at 9 AM

## Environment Variables

Before setting up cron jobs, ensure these environment variables are configured:

### Required Variables

1. **`CRON_SECRET`** - Secret token to authenticate cron job requests
   ```bash
   # Generate a secure random string (32+ characters)
   openssl rand -base64 32
   ```

2. **`RESEND_API_KEY`** - API key from Resend for sending emails
   - Sign up at https://resend.com
   - Get your API key from the dashboard

3. **Firebase credentials** - Already configured in `.env.local`

### Setting Environment Variables

**For Vercel:**
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add `CRON_SECRET` and `RESEND_API_KEY`
4. Make sure to add them for all environments (Production, Preview, Development)

**For GitHub Actions:**
1. Go to repository Settings → Secrets and variables → Actions
2. Add these secrets:
   - `CRON_SECRET` - Same value as Vercel
   - `APP_URL` - Your production URL (e.g., `https://iopps.com`)

## Option 1: Vercel Cron (Recommended for Vercel Deployments)

### Setup

The `vercel.json` file is already configured with three cron jobs:

```json
{
  "crons": [
    {
      "path": "/api/emails/send-job-alerts/instant",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/emails/send-job-alerts/daily",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/emails/send-job-alerts/weekly",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

### Deployment

1. Commit the `vercel.json` file to your repository
2. Deploy to Vercel: `vercel --prod`
3. The cron jobs will automatically be configured

### Monitoring

View cron job logs in the Vercel dashboard:
1. Go to your project
2. Click on "Cron Jobs" in the sidebar
3. View execution history and logs

### Limitations

- Only available on Pro and Enterprise plans
- Maximum execution time: 5 minutes (already configured with `maxDuration`)
- Cron jobs run in the deployment region

## Option 2: GitHub Actions (Works with Any Hosting)

### Setup

The `.github/workflows/job-alerts.yml` file is already configured.

### Configuration

1. Add repository secrets (Settings → Secrets and variables → Actions):
   - `CRON_SECRET` - Your cron secret token
   - `APP_URL` - Your production URL (e.g., `https://iopps.com`)

2. Commit the workflow file to your repository

3. Push to GitHub - the workflow will automatically start running on schedule

### Manual Triggering

You can manually trigger the workflow:
1. Go to Actions tab in GitHub
2. Select "Send Job Alerts" workflow
3. Click "Run workflow"

### Monitoring

View workflow runs in the Actions tab:
- See execution logs
- Check success/failure status
- Review alert sending statistics

## Testing Locally

### Test Individual Frequencies

```bash
# Set environment variables
export CRON_SECRET="your-secret-here"
export RESEND_API_KEY="your-resend-key-here"

# Start the dev server
cd web && npm run dev

# In another terminal, test each endpoint:

# Test instant alerts
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/emails/send-job-alerts/instant

# Test daily alerts
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/emails/send-job-alerts/daily

# Test weekly alerts
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/emails/send-job-alerts/weekly
```

### Test Without Sending Emails

To test the job matching logic without actually sending emails, temporarily comment out the `RESEND_API_KEY` in your `.env.local`. The system will skip email sending but still log what would have been sent.

### Create Test Data

1. **Create a test job alert:**
   - Sign in as a community member
   - Go to /member/alerts
   - Create an alert with specific criteria

2. **Create a matching job:**
   - Sign in as an approved employer
   - Post a job that matches the alert criteria

3. **Trigger the cron job:**
   - Run the curl command above
   - Check the response for sent/failed/skipped counts

## API Endpoints

### GET /api/emails/send-job-alerts/instant
Sends instant job alerts (for jobs posted in the last 15 minutes)

### GET /api/emails/send-job-alerts/daily
Sends daily digest of jobs posted in the last 24 hours

### GET /api/emails/send-job-alerts/weekly
Sends weekly digest of jobs posted in the last 7 days

### POST /api/emails/send-job-alerts
Main endpoint (called by the frequency-specific endpoints)
- Request body: `{ "frequency": "instant" | "daily" | "weekly" }`
- Requires `Authorization: Bearer {CRON_SECRET}` header

## Response Format

All endpoints return:

```json
{
  "success": true,
  "frequency": "daily",
  "alertsChecked": 15,
  "sent": 10,
  "failed": 0,
  "skipped": 5
}
```

## Troubleshooting

### No emails being sent

1. **Check RESEND_API_KEY is set correctly**
   ```bash
   # In Vercel dashboard, verify environment variable
   # Test Resend API key in their dashboard
   ```

2. **Check CRON_SECRET authentication**
   ```bash
   # Ensure CRON_SECRET matches between Vercel and cron job
   ```

3. **Verify email addresses exist**
   - Alerts require users to have email addresses in their profiles

4. **Check Firestore security rules**
   - Ensure jobAlerts collection is readable

### Cron jobs not running

**Vercel:**
- Verify you're on a Pro or Enterprise plan
- Check Cron Jobs section in dashboard
- Ensure deployment was successful

**GitHub Actions:**
- Check Actions tab for errors
- Verify secrets are set correctly
- Check workflow syntax

### Performance issues

If processing takes too long:
1. Add indexes to Firestore for:
   - `jobAlerts.active`
   - `jobAlerts.frequency`
   - `jobs.active`
   - `jobs.createdAt`

2. Consider batching:
   - Process alerts in smaller batches
   - Add pagination to queries

## Monitoring Best Practices

1. **Set up alerts** for cron job failures
2. **Monitor execution time** to ensure it stays under 5 minutes
3. **Track email delivery rates** in Resend dashboard
4. **Review logs regularly** for errors or issues

## Adjusting Schedules

To change cron schedules, edit `vercel.json` or `.github/workflows/job-alerts.yml`:

```
Cron syntax: * * * * *
             | | | | |
             | | | | +-- Day of week (0-6, Sunday=0)
             | | | +---- Month (1-12)
             | | +------ Day of month (1-31)
             | +-------- Hour (0-23)
             +---------- Minute (0-59)
```

Examples:
- `*/15 * * * *` - Every 15 minutes
- `0 9 * * *` - Daily at 9 AM
- `0 9 * * 1` - Monday at 9 AM
- `0 */4 * * *` - Every 4 hours
- `0 9,17 * * *` - Daily at 9 AM and 5 PM

## Security Considerations

1. **Never commit CRON_SECRET** to version control
2. **Use strong secrets** (32+ characters, random)
3. **Rotate secrets periodically**
4. **Monitor for unauthorized access** in logs
5. **Rate limit** if needed (already handled by cron schedule)
