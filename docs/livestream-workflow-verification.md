# IOPPS Live preview review

## Scope

The preview branch keeps Jobs first, IOPPS Live second, and Indigenous Businesses third. This change makes Live a viewing destination with a larger player, searchable recent replays, direct video links, upcoming broadcasts, a YouTube fallback, and an event production inquiry. The homepage uses the same feed and player. No production promotion, real account changes, or outbound inquiries are part of this work.

## Viewing flow

- Visitors can watch without signing in. Selecting a replay updates `/livestreams?video=VIDEO_ID`, loads the embedded player, and moves keyboard focus to it. The browser's Back action restores the earlier selection.
- Shared links verify the video belongs to the IOPPS channel. They can retrieve older replays beyond the 12 most recent uploads. Private, deleted, invalid, or unrelated videos produce an unavailable state.
- Live status comes from the verified video resource. An actual end time overrides a stale `live` snippet. Manual IDs are verified candidates and cannot force a live badge. Videos found through an upcoming search can transition to live after their metadata changes.
- A full upstream failure returns HTTP 503; partial discovery failures preserve verified videos with a warning. Missing configuration is an error, not an empty successful schedule.
- The player uses inline playback and a descriptive iframe title. Embedding-disabled videos link to YouTube. Every player includes a YouTube alternative because regional restrictions and rights claims may still prevent embedding.
- The event inquiry opens a prepared email draft addressed to partnership@iopps.ca, asking for event date, time zone, location, type, coverage and contact details. It does not send email or claim a booking is confirmed.

## Freshness and quota

YouTube search discovery is cached for one hour; uploads and known-video metadata are cached for 60 seconds. A viewer can use **Refresh** without losing the selected video. The response CDN cache is 30 seconds with a 30-second stale window. There is no automatic browser polling.

This reduces the previous two uncached search requests per origin hit. A newly scheduled or unscheduled broadcast absent from both the known search results and uploads may take up to the next successful hourly discovery to appear. An exact IOPPS video link or configured manual candidate can be verified directly. The YouTube channel remains the immediate fallback. Confirm this discovery cadence against the project's actual quota and the next event's operational needs before promoting to production; continuous broadcast discovery may warrant a channel notification integration.

Google's current documentation describes a default separate quota of 100 search calls per day. One shared discovery cache makes 48 search calls per full day before retries or separate deployments. This is not a claim about the actual quota configured for IOPPS.

Primary references:
- https://developers.google.com/youtube/v3/docs/videos — actualEndTime and embeddable behavior.
- https://developers.google.com/youtube/player_parameters — playsinline; deprecated modestbranding removed.
- https://developers.google.com/youtube/v3/determine_quota_cost — search quota and lower-cost metadata endpoints.

## Verification

- `node --experimental-strip-types --test tests/youtube-feed.test.ts tests/livestream-notifications.test.ts`: 16 passing tests (14 feed/caption cases plus two existing notification regressions).
- Feed tests cover ended manual overrides, ended live metadata, upcoming-to-live transitions, deduplication and cache separation, partial/full outages, verification failure, missing configuration, older shared videos, channel/privacy boundaries, scheduled sorting, valid empty feeds and preserved Nation names.
- Changed-source ESLint: passed.
- Optimized Next.js build and TypeScript: passed.
- Deployed browser verification: pending.

Actual live-broadcast transitions, email-client handoff, and physical phone playback require validation in their real environments. No active broadcast was available during the initial audit.
