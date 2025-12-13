import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      // Jobs to Jobs & Training redirects
      {
        source: "/jobs",
        destination: "/jobs-training",
        permanent: true,
      },
      {
        source: "/jobs/:path*",
        destination: "/jobs-training/:path*",
        permanent: true,
      },
      // Shop to Marketplace redirects
      {
        source: "/shop",
        destination: "/marketplace",
        permanent: true,
      },
      {
        source: "/shop/:path*",
        destination: "/marketplace/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
