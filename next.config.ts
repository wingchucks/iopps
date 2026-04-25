import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
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
    // CSP is shipped in Report-Only mode first so we can observe real
    // violations (browser console / reporting endpoint) before enforcing.
    // Once a few days of traffic look clean, switch the key below to
    // "Content-Security-Policy" to enforce.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://js.stripe.com https://*.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebaselogging-pa.googleapis.com https://api.stripe.com",
      "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://js.stripe.com https://hooks.stripe.com",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
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
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value: csp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
