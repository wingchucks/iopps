# PWA Setup Instructions for IOPPS

## Overview
The Progressive Web App (PWA) support has been added to the IOPPS Next.js application. This guide explains how to complete the setup.

## Files Created

### 1. `/public/manifest.json`
Web app manifest with IOPPS branding and configuration:
- App name: "IOPPS - Indigenous Jobs"
- Theme colors: #0F172A (dark slate)
- Standalone display mode
- App shortcuts for Jobs, Conferences, and Scholarships

### 2. `/public/sw.js`
Service worker implementing:
- **Cache-first strategy** for static assets (JS, CSS, images)
- **Network-first strategy** for API calls and dynamic data
- **Offline fallback** to `/offline` page when network unavailable
- Cache versioning for easy updates
- Automatic cleanup of old caches

### 3. `/app/offline/page.tsx`
Attractive offline fallback page with:
- Dark theme matching IOPPS brand (#0F172A, #14B8A6)
- Retry button to reload the page
- Home button to navigate back
- Helpful offline tips
- Clean, modern UI

## Service Worker Registration

The manifest is already linked in your root layout (`app/layout.tsx`). To complete the PWA setup, you need to register the service worker.

### Option 1: Register in Root Layout (Recommended)

Add the following script to your `/app/layout.tsx` in the `<head>` section:

```tsx
<head>
  {/* Existing scripts */}
  <script
    dangerouslySetInnerHTML={{
      __html: `
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', () => {
            navigator.serviceWorker
              .register('/sw.js')
              .then((registration) => {
                console.log('Service Worker registered:', registration);
              })
              .catch((error) => {
                console.log('Service Worker registration failed:', error);
              });
          });
        }
      `,
    }}
  />
</head>
```

### Option 2: Create a Separate Component

Create `/components/ServiceWorkerRegistration.tsx`:

```tsx
'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available, prompt user to refresh
                  if (confirm('New version available! Refresh to update?')) {
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}
```

Then add it to your root layout:

```tsx
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
```

## Theme Color Configuration

The root layout already has theme color configuration. Verify it matches the PWA colors:

```tsx
themeColor: [
  { media: "(prefers-color-scheme: light)", color: "#14B8A6" },
  { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
],
```

## Testing the PWA

### 1. Development Testing
```bash
npm run build
npm start
```

### 2. Check PWA Readiness
1. Open Chrome DevTools (F12)
2. Go to "Application" tab
3. Check "Manifest" section - should show IOPPS manifest
4. Check "Service Workers" section - should show registered worker
5. Use "Lighthouse" tab to run PWA audit

### 3. Test Offline Mode
1. Open DevTools > Network tab
2. Check "Offline" checkbox
3. Navigate between pages - should show offline page when needed
4. Previously visited pages should load from cache

### 4. Test Installation
1. In Chrome, look for install icon in address bar
2. Click to install IOPPS as a standalone app
3. App should open in standalone window

## Cache Strategy Details

### Static Assets (Cache-First)
- `/_next/static/*` - Next.js static files
- `.js`, `.css`, `.png`, `.jpg`, `.svg`, `.woff` files
- Served from cache immediately, updated in background

### API Calls (Network-First)
- `/api/*` - API routes
- `/_next/data/*` - Next.js data fetching
- Always tries network first, falls back to cache

### Pages (Network-First with Fallback)
- Navigation requests try network first
- Falls back to cached version if offline
- Shows `/offline` page if no cache available

## Updating the Service Worker

When you need to update the service worker:

1. Update the cache version in `/public/sw.js`:
```javascript
const CACHE_VERSION = 'v2'; // Increment version
```

2. Old caches are automatically cleaned up on activation

3. Users will get the new service worker on next page load

## Icons

The PWA uses `/public/logo.png` for app icons. For optimal results:
- Ensure logo.png is at least 512x512 pixels
- Use a square image with transparent or solid background
- Consider creating dedicated icon sizes: 192x192 and 512x512

To add separate icon files:
1. Create icon-192.png and icon-512.png in `/public/`
2. Update manifest.json icons array to reference these files

## Production Deployment

1. Ensure `NEXT_PUBLIC_SITE_URL` environment variable is set correctly
2. Deploy as normal - service worker will be served from `/sw.js`
3. HTTPS is required for service workers (automatic on Vercel, Netlify, etc.)

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Ensure you're on HTTPS (or localhost for development)
- Clear browser cache and try again

### Offline Page Not Showing
- Check that `/offline` route exists and works
- Verify service worker is caching the offline page
- Check DevTools > Application > Cache Storage

### Updates Not Applied
- Clear service worker: DevTools > Application > Service Workers > Unregister
- Clear cache: DevTools > Application > Cache Storage > Delete
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## Next Steps

Optional enhancements:
1. Add push notification support
2. Implement background sync for form submissions
3. Add update notification UI component
4. Create app install prompt component
5. Add analytics for offline usage

## Resources
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Next.js PWA Guide](https://nextjs.org/docs/app/building-your-application/configuring/progressive-web-apps)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
