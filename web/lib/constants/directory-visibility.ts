// Directory Visibility - Global Copy and Constants
// Used consistently across pricing page, dashboard, and notifications

/**
 * Directory Visibility Info Block
 * Use this copy consistently everywhere directory visibility is explained
 */
export const DIRECTORY_VISIBILITY_INFO = {
  title: "Directory Visibility",
  body: "Directory visibility means your organization appears in the Organization Directory and directory search. Posting a job or having an active plan keeps your listing visible. If visibility expires, your profile remains accessible by direct link but will not appear in directory listings or search results.",
};

/**
 * Pricing page visibility bullets for each product type
 */
export const DIRECTORY_VISIBILITY_BULLETS = {
  SINGLE_JOB: "Includes Directory Visibility for 30 days",
  FEATURED_JOB: "Includes Directory Visibility for 45 days",
  GROWTH_SUBSCRIPTION: "Includes Directory Visibility while plan is active",
  UNLIMITED_SUBSCRIPTION: "Includes Directory Visibility while plan is active",
  VENDOR_MONTHLY: "Includes Directory Visibility while subscription is active",
  VENDOR_ANNUAL: "Includes Directory Visibility while subscription is active",
} as const;

/**
 * Dashboard Directory Status Card Copy
 */
export const DIRECTORY_STATUS_COPY = {
  // Grandfathered status
  GRANDFATHERED: {
    status: "Visible in Directory",
    subtext: "Grandfathered listing",
  },
  // Visible with expiry date
  VISIBLE: {
    status: "Visible in Directory",
    subtextTemplate: "Visible until: {date}",
  },
  // Not visible
  NOT_VISIBLE: {
    status: "Not Visible in Directory",
    subtext: "Your listing is inactive. Post a job or choose a plan to appear in the directory and search.",
    ctaPostJob: "Post a Job",
    ctaViewPlans: "View Plans",
  },
} as const;

/**
 * Owner-only banner shown on public org profile when not visible
 */
export const OWNER_BANNER_COPY = {
  message: "Your listing is currently not visible in the Organization Directory. Post a job or choose a plan to appear in directory search and listings.",
} as const;

/**
 * Notification text constants for directory visibility
 * Wire these to the notification/email system when available
 */
export const DIRECTORY_VISIBILITY_NOTIFICATIONS = {
  // Expiring soon (7 days before)
  EXPIRING_SOON: {
    subject: "Your Directory Visibility is Ending Soon",
    body: "Your directory visibility is ending soon. Keep your organization visible by posting a job or renewing your plan.",
  },
  // Already expired
  EXPIRED: {
    subject: "Your Directory Visibility Has Expired",
    body: "Your organization is no longer visible in the directory. Your profile is still accessible by direct link.",
  },
} as const;

/**
 * TODO: Wire notification hooks when notification system is ready
 *
 * To implement directory visibility notifications:
 * 1. Create a cron job that checks for organizations with directoryVisibleUntil within 7 days
 * 2. Send EXPIRING_SOON notification email using the copy above
 * 3. Create another cron job for just-expired organizations
 * 4. Send EXPIRED notification email using the copy above
 *
 * Location suggestions:
 * - Add cron endpoints to: /web/app/api/cron/directory-visibility-check/route.ts
 * - Add email templates to: /web/lib/emails/templates.ts
 * - Add to vercel.json cron configuration
 */
