// Product catalog for admin product management
// All prices in CAD cents

import { ProductConfig, ProductCategory, ProductType } from "./types";

export const PRODUCT_CATALOG: Record<ProductType, ProductConfig> = {
  // Job Products
  SINGLE: {
    category: "job",
    productType: "SINGLE",
    name: "Single Job Post",
    price: 12500, // $125.00
    duration: 30,
    features: [
      "1 job posting",
      "Live for 30 days",
      "Standard placement",
    ],
    defaultStats: {
      jobsPosted: 0,
      jobsRemaining: 1,
    },
  },
  FEATURED: {
    category: "job",
    productType: "FEATURED",
    name: "Featured Job Ad",
    price: 30000, // $300.00
    duration: 45,
    features: [
      "1 featured job posting",
      "Live for 45 days",
      "Featured spotlight placement",
      "Employer logo & branding",
      "Analytics (views & clicks)",
    ],
    defaultStats: {
      jobsPosted: 0,
      jobsRemaining: 1,
      featuredJobsUsed: 0,
      featuredJobsRemaining: 1,
    },
  },

  // Subscription Products
  TIER1: {
    category: "subscription",
    productType: "TIER1",
    name: "Tier 1 – Basic Visibility",
    price: 125000, // $1,250.00
    duration: 365,
    features: [
      "15 job postings per year",
      "15 featured listings included",
      "Standard placement",
      "Basic organization profile",
      "Access to posting analytics",
    ],
    defaultStats: {
      jobsPosted: 0,
      jobsRemaining: 15,
      featuredJobsUsed: 0,
      featuredJobsRemaining: 15,
    },
  },
  TIER2: {
    category: "subscription",
    productType: "TIER2",
    name: "Tier 2 – Unlimited + Shop",
    price: 250000, // $2,500.00
    duration: 365,
    features: [
      "Unlimited job postings",
      "5 rotating featured listings",
      "Organization branding",
      "Candidate engagement analytics",
      "Shop Indigenous listing included",
    ],
    defaultStats: {
      jobsPosted: 0,
      jobsRemaining: "unlimited",
      featuredJobsUsed: 0,
      featuredJobsRemaining: 5,
      vendorListingActive: true,
    },
  },

  // Conference Products
  CONFERENCE_STANDARD: {
    category: "conference",
    productType: "CONFERENCE_STANDARD",
    name: "Conference / Event Posting",
    price: 25000, // $250.00
    duration: 90,
    features: [
      "1 event listing",
      "Live for 90 days",
      "Banner image & description",
      "Registration link",
    ],
    defaultStats: {
      conferencesPosted: 0,
      conferencesRemaining: 1,
    },
  },
  CONFERENCE_FEATURED: {
    category: "conference",
    productType: "CONFERENCE_FEATURED",
    name: "Featured Conference Spotlight",
    price: 40000, // $400.00
    duration: 120,
    features: [
      "1 featured event listing",
      "Live for 120 days",
      "Featured badge & top positioning",
      "Priority homepage visibility",
    ],
    defaultStats: {
      conferencesPosted: 0,
      conferencesRemaining: 1,
    },
  },

  // Vendor Products
  VENDOR_MONTHLY: {
    category: "vendor",
    productType: "VENDOR_MONTHLY",
    name: "Monthly Vendor Listing",
    price: 5000, // $50.00/month
    duration: 30,
    features: [
      "Shop Indigenous listing",
      "Products & services display",
      "Direct contact & social links",
      "Renews monthly",
    ],
    defaultStats: {
      vendorListingActive: true,
    },
  },
  VENDOR_ANNUAL: {
    category: "vendor",
    productType: "VENDOR_ANNUAL",
    name: "Annual Vendor Plan",
    price: 40000, // $400.00/year
    duration: 365,
    features: [
      "Shop Indigenous listing",
      "Priority placement",
      "Save $200 vs monthly",
      "Annual discounted rate",
    ],
    defaultStats: {
      vendorListingActive: true,
    },
  },

  // Custom Products
  CUSTOM: {
    category: "custom",
    productType: "CUSTOM",
    name: "Custom Package",
    price: 0,
    duration: 365,
    features: [
      "Custom package tailored to your needs",
    ],
    defaultStats: {},
  },
};

// Get products by category
export function getProductsByCategory(category: ProductCategory): ProductConfig[] {
  return Object.values(PRODUCT_CATALOG).filter(p => p.category === category);
}

// Get product config by type
export function getProductConfig(productType: ProductType): ProductConfig {
  return PRODUCT_CATALOG[productType];
}

// Format price for display
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString()}`;
}

// Calculate expiration date from activation
export function calculateExpirationDate(activatedAt: Date, durationDays: number): Date {
  const expiresAt = new Date(activatedAt);
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  return expiresAt;
}

// Check if product is expired
export function isProductExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date() > new Date(expiresAt);
}

// Category labels for display
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  job: "Job Postings",
  subscription: "Subscriptions",
  conference: "Conferences & Events",
  vendor: "Shop Indigenous",
  custom: "Custom",
};
