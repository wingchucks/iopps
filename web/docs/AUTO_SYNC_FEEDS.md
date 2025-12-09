# Automatic Feed Sync Documentation

## Overview

The **Auto-Sync Feeds** feature automatically imports jobs from RSS/XML feeds at scheduled intervals (hourly, daily, or weekly). This eliminates the need for manual imports and ensures your job board stays up-to-date.

## Features

- ✅ **Automatic Syncing**: Feeds sync automatically based on their configured frequency
- ✅ **Three Sync Frequencies**: Hourly, Daily, Weekly (Manual also available)
- ✅ **Batch Processing**: Processes all active feeds in a single cron run
- ✅ **Smart Deduplication**: Skips or updates existing jobs based on configuration
- ✅ **Feed-Based Expiration**: Automatically expires jobs removed from the feed
- ✅ **UTM Tracking**: Appends analytics parameters to application URLs
- ✅ **SEO Control**: Option to mark imported jobs as no-index
- ✅ **Error Tracking**: Logs sync errors for each feed

## Configuration

### 1. Environment Variables

Add the following to your `.env.local` file:

```bash
# Cron Job Security (generate a random secret)
CRON_SECRET=your_random_secret_string_here
```

**Important**: The `CRON_SECRET` is used to authenticate cron job requests. Generate a strong random string:

```bash
# Generate a random secret (Linux/Mac)
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Vercel Cron Configuration

The cron schedules are configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-feeds?frequency=hourly",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/sync-feeds?frequency=daily",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/sync-feeds?frequency=weekly",
      "schedule": "0 7 * * 1"
    }
  ]
}
```

**Cron Schedules**:
- **Hourly**: `0 * * * *` - Every hour at minute 0
- **Daily**: `0 6 * * *` - Every day at 6:00 AM UTC
- **Weekly**: `0 7 * * 1` - Every Monday at 7:00 AM UTC

### 3. Deploy to Vercel

After deploying, Vercel automatically sets up the cron jobs. You need to:

1. Add `CRON_SECRET` to your Vercel environment variables:
   - Go to your project → Settings → Environment Variables
   - Add `CRON_SECRET` with your generated secret
   - Redeploy your project

2. Verify cron jobs are active:
   - Go to your project → Deployments → Cron
   - You should see the three sync-feeds cron jobs listed

## Usage

### Setting Up a Feed for Auto-Sync

1. Go to `/admin/feeds` in your admin panel
2. Click "Add new auto import"
3. Configure the feed:
   - **Feed URL**: The XML/RSS feed URL
   - **Import Name**: Friendly name (e.g., "SIGA Jobs")
   - **Select Employer**: Choose the employer account
   - **Sync Frequency**: Select `Hourly`, `Daily`, or `Weekly`
   - **Job Expiration**: Choose expiration strategy
   - **UTM Tracking Tag**: (Optional) Analytics parameters
   - **No-Index by Google**: Check to prevent SEO indexing
   - **Update imported jobs**: Check to refresh existing jobs

4. Click "Add Import"

### Manual Testing

You can test the cron job manually before deploying:

#### Local Testing (Development)

```bash
# Make sure your dev server is running
npm run dev

# In another terminal, test the cron endpoint
curl http://localhost:3000/api/cron/sync-feeds?frequency=hourly

# Or test all frequencies
curl http://localhost:3000/api/cron/sync-feeds
```

#### Production Testing

```bash
# Test on Vercel (use your CRON_SECRET)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.com/api/cron/sync-feeds?frequency=hourly
```

**Note**: If `CRON_SECRET` is not set, the endpoint works without authentication (development mode).

## API Reference

### Endpoint: `GET /api/cron/sync-feeds`

**Query Parameters**:
- `frequency` (optional): `hourly` | `daily` | `weekly`
  - If provided, only syncs feeds with matching frequency
  - If omitted, syncs all non-manual feeds

**Headers**:
- `Authorization: Bearer <CRON_SECRET>` (required in production)

**Response**:
```json
{
  "success": true,
  "feedsSynced": 5,
  "feedsFailed": 1,
  "totalJobsImported": 42,
  "totalJobsUpdated": 15,
  "totalJobsExpired": 8,
  "errors": [
    "SIGA Feed: Failed to fetch feed: 404 Not Found"
  ],
  "timestamp": "2024-01-15T06:00:00.000Z"
}
```

## Feed Processing Logic

For each active feed with matching sync frequency:

1. **Fetch & Parse**: Download and parse XML from `feedUrl`
2. **Job Processing**:
   - Check for duplicate jobs (by `applicationLink`)
   - If duplicate exists and `updateExistingJobs` is `true`: Update the job
   - If duplicate exists and `updateExistingJobs` is `false`: Skip
   - If new job: Create new job document
3. **Apply Transformations**:
   - Append UTM tracking tag if configured
   - Decode HTML entities in description
   - Set `noIndex` flag if configured
4. **Expiration Handling**:
   - If `jobExpiration.type` is `"days"`: Set `closingDate` to X days from import
   - If `jobExpiration.type` is `"feed"`: Expire jobs no longer in feed
   - If `jobExpiration.type` is `"never"`: No automatic expiration
5. **Update Feed Metadata**:
   - Update `lastSyncedAt` timestamp
   - Update `totalJobsImported` count
   - Store any `syncErrors`

## Monitoring & Troubleshooting

### View Sync Status

In the admin feeds page (`/admin/feeds`), you can see:
- **Last Import**: When the feed was last synced
- **Jobs Imported**: Total jobs imported from this feed
- **Settings Badges**: Visual indicators for active features
- **Warning Count**: Number of errors from last sync

### Common Issues

#### 1. Feeds Not Syncing Automatically

**Check**:
- Is the feed `active`? (Check status in admin panel)
- Is `syncFrequency` set to something other than `"manual"`?
- Is `CRON_SECRET` correctly set in Vercel environment variables?
- Are cron jobs enabled in your Vercel plan?

**Debug**:
```bash
# Check Vercel cron logs
vercel logs --follow

# Or view in Vercel dashboard → Deployments → Logs
```

#### 2. "Unauthorized" Error

**Cause**: `CRON_SECRET` mismatch or missing

**Fix**:
1. Verify `CRON_SECRET` is set in Vercel environment variables
2. Ensure the secret matches what Vercel uses for cron authentication
3. Redeploy after updating environment variables

#### 3. Feed Import Errors

**Causes**:
- Invalid XML format
- Feed URL is down or requires authentication
- Missing required fields (title, applyurl)

**Fix**:
- Check `syncErrors` in the feed document
- View detailed errors in the admin panel
- Test the feed URL manually

### Logs

The cron job logs detailed information:

```
Starting feed sync cron job for frequency: hourly
Found 3 feed(s) to sync
Syncing feed: SIGA Jobs (abc123)
✓ SIGA Jobs: imported 5, updated 2, expired 1
✓ Tech Jobs: imported 12, updated 0, expired 0
✗ Marketing Jobs: Failed to fetch feed: 404 Not Found
Feed sync cron completed. Synced: 2, Failed: 1, Total jobs imported: 17
```

## Security Considerations

1. **CRON_SECRET Protection**:
   - Never commit `CRON_SECRET` to version control
   - Use different secrets for development and production
   - Rotate the secret periodically

2. **Feed URL Validation**:
   - Only add feeds from trusted sources
   - Feeds can potentially inject malicious HTML in job descriptions
   - Consider adding URL whitelist validation

3. **Rate Limiting**:
   - The cron job has a 5-minute timeout (`maxDuration: 300`)
   - Process large feeds in batches if needed

## Performance Optimization

### For Large Feeds (1000+ jobs)

1. **Increase Timeout**: Modify `maxDuration` in the route:
   ```typescript
   export const maxDuration = 600; // 10 minutes
   ```

2. **Batch Processing**: Consider splitting large feeds:
   ```typescript
   // Process jobs in chunks of 100
   for (let i = 0; i < jobs.length; i += 100) {
     const batch = jobs.slice(i, i + 100);
     await processBatch(batch);
   }
   ```

3. **Database Optimization**:
   - Ensure Firestore indexes exist for `importedFrom` and `active` fields
   - Use batch writes for bulk updates

### Reducing Costs

- Use `"manual"` frequency for low-traffic feeds
- Set `updateExistingJobs: false` to skip duplicate checks
- Use `jobExpiration.type: "feed"` to automatically clean up old jobs

## Migration Guide

If you have existing feeds with manual sync only:

1. Edit each feed in `/admin/feeds`
2. Change **Sync Frequency** from "Manual only" to your preferred schedule
3. Save changes
4. The feed will be automatically synced at the next cron run

## Example Workflows

### High-Volume Job Board
```
Frequency: Hourly
Update Existing: true
Expiration: Jobs expire if removed from feed
UTM Tracking: utm_source=autoimport&utm_medium=feed
No-Index: false (allow SEO)
```

### Partner Integration
```
Frequency: Daily
Update Existing: false
Expiration: Jobs expire after 30 days
UTM Tracking: utm_source=partner&utm_campaign=jobs
No-Index: true (prevent duplicate content)
```

### Weekly Newsletter
```
Frequency: Weekly
Update Existing: true
Expiration: Never
UTM Tracking: utm_source=newsletter&utm_medium=email
No-Index: false
```

## Support

For issues or questions:
1. Check the sync errors in the admin panel
2. Review Vercel cron logs
3. Test the endpoint manually with curl
4. Check this documentation for troubleshooting tips

---

**Last Updated**: 2024-01-15
**Version**: 1.0.0
