import Stripe from "stripe";

// Initialize Stripe with a dummy key for build time if missing
// This prevents build failures when env vars aren't fully loaded yet
const stripeKey = process.env.STRIPE_SECRET_KEY || "dummy_key_for_build";

export const stripe = new Stripe(stripeKey, {
  apiVersion: "2026-01-28.clover",
  typescript: true,
});

// Job posting product configurations (single posts)
// All prices in CAD cents
export const JOB_POSTING_PRODUCTS = {
  SINGLE: {
    name: "Single Job Post",
    price: 12500, // $125.00 CAD
    duration: 30, // days
    featured: false,
    jobCredits: 1,
    talentPoolAccessDays: 0,
    description:
      "1 job posting live for 30 days with standard placement",
  },
  FEATURED: {
    name: "Featured Job Ad",
    price: 30000, // $300.00 CAD
    duration: 45, // days
    featured: true,
    jobCredits: 1,
    talentPoolAccessDays: 7,
    description:
      'Posted for 45 days with "Featured" spotlight placement, employer logo & branding, and analytics',
  },
} as const;

export type JobPostingProductType = keyof typeof JOB_POSTING_PRODUCTS;

// Organization subscription tiers (annual plans)
export const SUBSCRIPTION_PRODUCTS = {
  TIER1: {
    name: "Growth",
    price: 125000, // $1,250.00
    duration: 365,
    featured: false,
    jobCredits: 15,
    featuredJobCredits: 15,
    unlimitedPosts: false,
    talentPoolAccessDays: 0,
    description:
      "15 job postings per year with standard placement and basic organization profile",
    features: [
      "15 job postings per year",
      "Standard placement",
      "Basic organization profile page",
      "Access to posting analytics",
      "15 Featured Job Listings included",
      "Logo on homepage Partner Carousel",
    ],
  },
  TIER2: {
    name: "Unlimited",
    price: 250000, // $2,500.00
    duration: 365,
    featured: true,
    jobCredits: -1, // unlimited
    featuredJobCredits: 5,
    unlimitedPosts: true,
    shopListingIncluded: true,
    talentPoolAccessDays: 30,
    description:
      "Unlimited job postings for 12 months with Shop Indigenous listing included",
    features: [
      "Unlimited job postings for 12 months",
      "Organization branding on postings",
      "Logo on homepage Partner Carousel",
      "Rotating featured listings on homepage & job board",
      "Candidate engagement analytics",
      "Standard customer support",
      "Rotating Featured Jobs included",
      "Shop Indigenous listing included",
      "30 days Talent Pool Access included",
    ],
  },
} as const;

export type SubscriptionProductType = keyof typeof SUBSCRIPTION_PRODUCTS;

// Conference/Event product configurations
// NOTE: Conference posting is FREE. These are visibility upgrades only.
export const CONFERENCE_PRODUCTS = {
  FEATURED_90: {
    name: "Featured Conference (90 Days)",
    price: 25000, // $250.00
    duration: 90,
    featured: true,
    description:
      "Boost your conference visibility with featured badge and priority placement for 90 days. Posting is always free.",
  },
  FEATURED_365: {
    name: "Featured Conference Spotlight (365 Days)",
    price: 40000, // $400.00
    duration: 365,
    featured: true,
    description:
      "Maximum visibility with featured badge, homepage spotlight, and top positioning for a full year. Posting is always free.",
  },
} as const;

export type ConferenceProductType = keyof typeof CONFERENCE_PRODUCTS;

// Shop Indigenous vendor products
export const VENDOR_PRODUCTS = {
  MONTHLY: {
    name: "Featured Business",
    price: 2500, // $25.00 per month
    duration: 30,
    featured: true,
    recurring: true,
    firstMonthFree: false,
    description: "Boost your visibility in Shop Indigenous marketplace",
    features: [
      "Everything in Free listing",
      "Featured badge on listing",
      "Priority placement in directory",
      "Highlighted in search results",
    ],
  },
} as const;

export type VendorProductType = "MONTHLY";

// Training Program product configurations
// NOTE: Training program listing is FREE. These are visibility upgrades only.
export const TRAINING_PRODUCTS = {
  FEATURED_60: {
    name: "Program Listing (60 Days)",
    price: 15000, // $150.00 CAD
    duration: 60,
    featured: true,
    description:
      "List your 3+ month program with featured badge and priority placement for 60 days.",
  },
  FEATURED_90: {
    name: "Program Listing (90 Days)",
    price: 22500, // $225.00 CAD
    duration: 90,
    featured: true,
    description:
      "List your 3+ month program with featured badge and top positioning for 90 days.",
  },
} as const;

export type TrainingProductType = keyof typeof TRAINING_PRODUCTS;

// Talent Pool Access
export const TALENT_POOL_PRODUCTS = {
  MONTHLY: {
    name: "Talent Pool Monthly Access",
    price: 9900, // $99.00 CAD
    duration: 30,
    description: "Browse and contact Indigenous talent for 30 days",
    features: [
      "Browse all talent profiles",
      "Contact candidates directly",
      "Save favorite candidates",
      "Advanced search filters",
    ],
  },
  ANNUAL: {
    name: "Talent Pool Annual Access",
    price: 89900, // $899.00 CAD
    duration: 365,
    description:
      "Browse and contact Indigenous talent for 12 months (save $289)",
    features: [
      "Everything in Monthly",
      "Priority support",
      "Early access to new features",
      "Bulk messaging tools",
    ],
  },
} as const;

export type TalentPoolProductType = keyof typeof TALENT_POOL_PRODUCTS;

// School/Education Institution products
export const SCHOOL_PRODUCTS = {
  PARTNER: {
    name: "School Partner",
    price: 450000, // $4,500.00 per year
    duration: 365,
    featured: true,
    trialAvailable: true,
    trialDays: 90,
    description: "Complete school partnership with unlimited everything",
    features: [
      "Full school profile page",
      "Unlimited job postings",
      "Unlimited program listings",
      "Unlimited scholarship listings",
      "Unlimited training program listings",
      "Featured placement in school directory",
      "Homepage carousel rotation",
      "Recruitment event listings",
      "Analytics dashboard",
      "Priority support",
    ],
    programLimit: -1, // unlimited
    scholarshipLimit: -1, // unlimited
    jobCredits: -1, // unlimited
  },
} as const;

export type SchoolProductType = keyof typeof SCHOOL_PRODUCTS;
