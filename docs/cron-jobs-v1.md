# Cron Jobs - V1 Baseline

> Extracted from `web/vercel.json` on 2026-02-14.
> All cron jobs run on Vercel Cron and are authenticated via `CRON_SECRET`.

## Job Alert Emails

| Path | Schedule | Frequency | Description |
|------|----------|-----------|-------------|
| `/api/emails/send-job-alerts/instant` | `*/15 * * * *` | Every 15 minutes | Send instant job alert emails to subscribers |
| `/api/emails/send-job-alerts/daily` | `0 9 * * *` | Daily at 9:00 AM UTC | Send daily job alert digest emails |
| `/api/emails/send-job-alerts/weekly` | `0 9 * * 1` | Mondays at 9:00 AM UTC | Send weekly job alert digest emails |

## Expiration Jobs

| Path | Schedule | Frequency | Description |
|------|----------|-----------|-------------|
| `/api/cron/expire-jobs` | `0 0 * * *` | Daily at midnight UTC | Expire job postings past their end date |
| `/api/cron/expire-directory-visibility` | `0 1 * * *` | Daily at 1:00 AM UTC | Expire featured/boosted directory visibility |
| `/api/cron/expire-events` | `0 1 * * *` | Daily at 1:00 AM UTC | Expire past events |
| `/api/cron/expire-scholarships` | `0 2 * * *` | Daily at 2:00 AM UTC | Expire past scholarships |

## Scheduled Publishing

| Path | Schedule | Frequency | Description |
|------|----------|-----------|-------------|
| `/api/cron/publish-scheduled-jobs` | `*/15 * * * *` | Every 15 minutes | Publish jobs that have reached their scheduled publish date |

## RSS Feed Syncing

| Path | Schedule | Frequency | Description |
|------|----------|-----------|-------------|
| `/api/cron/sync-feeds?frequency=hourly` | `0 * * * *` | Every hour (top of hour) | Sync RSS feeds marked as hourly frequency |
| `/api/cron/sync-feeds?frequency=daily` | `0 6 * * *` | Daily at 6:00 AM UTC | Sync RSS feeds marked as daily frequency |
| `/api/cron/sync-feeds?frequency=weekly` | `0 7 * * 1` | Mondays at 7:00 AM UTC | Sync RSS feeds marked as weekly frequency |

## Summary

- **Total cron jobs**: 11
- **High-frequency** (every 15 min): 2 (instant alerts, scheduled publishing)
- **Hourly**: 1 (hourly feed sync)
- **Daily**: 5 (daily alerts, expire jobs, expire directory, expire events, expire scholarships, daily feed sync)
- **Weekly**: 2 (weekly alerts, weekly feed sync)
