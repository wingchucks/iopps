import type { NextConfig } from "next";

// Start in report-only mode so production traffic can reveal any missing
// Firebase, analytics, media, or embed origins before CSP is enforced.
const contentSecurityPolicyReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com https://www.gstatic.com https://www.youtube.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.googleusercontent.com https://i.ytimg.com",
  "media-src 'self' blob: https://firebasestorage.googleapis.com https://storage.googleapis.com",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com",
  "frame-src 'self' https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com https://*.firebaseapp.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  distDir: process.env.IOPPS_BUILD_DIRECTORY || ".next",
  async rewrites() {
    // The private local preview can consume the existing public video feed.
    // Production continues to use its own authenticated YouTube integration.
    return {
      beforeFiles: process.env.NODE_ENV === "development" && process.env.IOPPS_PREVIEW_PUBLIC_FEED === "true"
        ? [{ source: "/api/livestreams/youtube", destination: "https://iopps.ca/api/livestreams/youtube" }]
        : [],
    };
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.squarespace-cdn.com", pathname: "/content/v1/**" },
      { protocol: "https", hostname: "rmkcdn.successfactors.com" },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
  },
  async redirects() {
    return [
      // Redirect jobs.iopps.ca → iopps.ca (old SmartJobBoard domain)
      {
        source: "/:path*",
        has: [{ type: "host", value: "jobs.iopps.ca" }],
        destination: "https://www.iopps.ca/:path*",
        permanent: true,
      },
      { source: "/signin", destination: "/login", permanent: true },
      { source: "/sign-in", destination: "/login", permanent: true },
      { source: "/log-in", destination: "/login", permanent: true },
      { source: "/register", destination: "/signup", permanent: true },
      { source: "/sign-up", destination: "/signup", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-store" }] },
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicyReportOnly,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
