import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* Monorepo root — prevents lockfile-detection from choosing user home dir */
  outputFileTracingRoot: path.join(__dirname, ".."),

  /* Performance Optimizations */
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  /* Compression */
  compress: true,

  /* Strict Mode for better debugging */
  reactStrictMode: true,



  /* Headers for security and caching */
  async headers() {
    return [
      {
        // Security headers for all routes
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.googletagmanager.com https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https: http:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://api.stripe.com https://*.sentry.io https://*.google-analytics.com https://*.resend.com; frame-src 'self' https://js.stripe.com https://accounts.google.com https://*.firebaseapp.com; object-src 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
      {
        // Cache static assets
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  /* Redirects for backwards compatibility */
  async redirects() {
    return [
      // Hub to Discover redirect (backwards compat for old /hub URL)
      {
        source: "/hub",
        destination: "/discover",
        permanent: false,
      },
      // Admin route consolidation (only redirect routes that have destination pages)
      {
        source: "/admin/members",
        destination: "/admin/users",
        permanent: false,
      },
      // Employer to Organization redirects
      {
        source: "/employer/:path*",
        destination: "/organization/:path*",
        permanent: true,
      },
      // Vendor to Organization/Shop redirects
      {
        source: "/vendor/:path*",
        destination: "/organization/shop/:path*",
        permanent: true,
      },
      // Jobs-training to Careers redirects (NEW)
      {
        source: "/jobs-training",
        destination: "/careers",
        permanent: true,
      },
      {
        source: "/jobs-training/:path*",
        destination: "/careers/:path*",
        permanent: true,
      },
      // Old jobs to careers redirects
      {
        source: "/jobs",
        destination: "/careers",
        permanent: true,
      },
      {
        source: "/jobs/:path*",
        destination: "/careers/:path*",
        permanent: true,
      },
      // Scholarships to Education/Scholarships redirects (NEW)
      {
        source: "/scholarships",
        destination: "/education/scholarships",
        permanent: true,
      },
      {
        source: "/scholarships/:path*",
        destination: "/education/scholarships/:path*",
        permanent: true,
      },
      // Marketplace to Business redirects (NEW)
      {
        source: "/marketplace",
        destination: "/business",
        permanent: true,
      },
      {
        source: "/marketplace/:path*",
        destination: "/business/:path*",
        permanent: true,
      },
      // Shop to Business redirects
      {
        source: "/shop",
        destination: "/business",
        permanent: true,
      },
      {
        source: "/shop/:path*",
        destination: "/business/:path*",
        permanent: true,
      },
      // NOTE: /business is now Shop Indigenous page - no redirect
      // Businesses to Organizations redirects (URL rename)
      {
        source: "/businesses",
        destination: "/organizations",
        permanent: true,
      },
      {
        source: "/businesses/:slug*",
        destination: "/organizations/:slug*",
        permanent: true,
      },
      // Powwows to Community redirects (NEW)
      {
        source: "/powwows",
        destination: "/community",
        permanent: true,
      },
      {
        source: "/powwows/:path*",
        destination: "/community/:path*",
        permanent: true,
      },
      // Sign in alias redirect
      {
        source: "/signin",
        destination: "/login",
        permanent: true,
      },
      // Streams to Live redirect
      {
        source: "/streams",
        destination: "/live",
        permanent: true,
      },
      // Notifications to Member Alerts redirect
      {
        source: "/notifications",
        destination: "/member/alerts",
        permanent: true,
      },
      // Organization registration shortcut
      {
        source: "/organization/register",
        destination: "/register",
        permanent: false,
      },
      // Organization post-job shortcut
      {
        source: "/organization/post-job",
        destination: "/organization/jobs/new",
        permanent: true,
      },
      // Organization sub-route aliases (QA fix)
      {
        source: "/organization/manage/profile",
        destination: "/organization/profile",
        permanent: false,
      },
      {
        source: "/organization/manage/team",
        destination: "/organization/team",
        permanent: false,
      },
      {
        source: "/organization/manage/billing",
        destination: "/organization/billing",
        permanent: false,
      },
      {
        source: "/organization/manage/settings",
        destination: "/organization/settings",
        permanent: false,
      },
      {
        source: "/organization/hire/talent-pool",
        destination: "/organization/hire/talent",
        permanent: false,
      },
      {
        source: "/organization/host/conferences/new",
        destination: "/organization/conferences/new",
        permanent: false,
      },
      {
        source: "/organization/vendor/products",
        destination: "/organization/sell/offerings",
        permanent: false,
      },
      {
        source: "/organization/vendor/orders",
        destination: "/organization/sell/inquiries",
        permanent: false,
      },
      {
        source: "/organization/vendor/store-settings",
        destination: "/organization/shop/setup",
        permanent: false,
      },
      {
        source: "/organization/training/programs/new",
        destination: "/organization/training/new",
        permanent: false,
      },
      {
        source: "/organization/training/programs",
        destination: "/organization/training",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
