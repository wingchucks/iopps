import Stripe from "stripe";

// Initialize Stripe with a dummy key for build time if missing
// This prevents build failures when env vars aren't fully loaded yet
const stripeKey = process.env.STRIPE_SECRET_KEY || "dummy_key_for_build";

export const stripe = new Stripe(stripeKey, {
    apiVersion: "2025-11-17.clover",
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
        talentPoolAccessDays: 0, // No bonus talent pool access
        description: "1 job posting live for 30 days with standard placement",
    },
    FEATURED: {
        name: "Featured Job Ad",
        price: 30000, // $300.00 CAD
        duration: 45, // days
        featured: true,
        jobCredits: 1,
        talentPoolAccessDays: 7, // 7 days bonus talent pool access
        description: 'Posted for 45 days with "Featured" spotlight placement, employer logo & branding, and analytics',
    },
} as const;

export type JobPostingProductType = keyof typeof JOB_POSTING_PRODUCTS;

// Organization subscription tiers (annual plans)
export const SUBSCRIPTION_PRODUCTS = {
    TIER1: {
        name: "Growth",
        price: 125000, // $1,250.00
        duration: 365, // days (1 year)
        featured: false,
        jobCredits: 15, // 15 job postings per year
        featuredJobCredits: 15, // 15 featured listings included
        unlimitedPosts: false,
        talentPoolAccessDays: 0, // Not included - purchase separately
        description: "15 job postings per year with standard placement and basic organization profile",
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
        duration: 365, // days (1 year)
        featured: true,
        jobCredits: -1, // unlimited
        featuredJobCredits: 5, // 5 rotating featured
        unlimitedPosts: true,
        shopListingIncluded: true,
        talentPoolAccessDays: 30, // 30 days bonus talent pool access
        description: "Unlimited job postings for 12 months with Shop Indigenous listing included",
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
        duration: 90, // days
        featured: true,
        description: "Boost your conference visibility with featured badge and priority placement for 90 days. Posting is always free.",
    },
    FEATURED_365: {
        name: "Featured Conference Spotlight (365 Days)",
        price: 40000, // $400.00
        duration: 365, // days
        featured: true,
        description: "Maximum visibility with featured badge, homepage spotlight, and top positioning for a full year. Posting is always free.",
    },
} as const;

export type ConferenceProductType = keyof typeof CONFERENCE_PRODUCTS;

// Shop Indigenous vendor products
export const VENDOR_PRODUCTS = {
    MONTHLY: {
        name: "Monthly Vendor Listing",
        price: 5000, // $50.00 per month
        duration: 30, // days
        featured: false,
        recurring: true,
        firstMonthFree: true,
        description: "Your Indigenous-owned business listed in Shop Indigenous marketplace",
        features: [
            "Your Indigenous-owned business listed in Shop Indigenous",
            "Products, services, images, descriptions",
            "Direct contact links & social links",
            "FIRST MONTH FREE",
            "Renews monthly at $50/month",
        ],
    },
    ANNUAL: {
        name: "Annual Vendor Plan",
        price: 40000, // $400.00 per year (save $200)
        duration: 365, // days
        featured: true,
        recurring: false,
        firstMonthFree: false,
        description: "Save $200 vs monthly with priority placement in Shop Indigenous marketplace",
        features: [
            "Save $200 vs monthly",
            "Includes all features above",
            "Priority placement inside the Shop Indigenous marketplace",
            "Annual discounted rate",
        ],
    },
} as const;

export type VendorProductType = keyof typeof VENDOR_PRODUCTS;

// Training Program product configurations
// NOTE: Training program listing is FREE. These are visibility upgrades only.
export const TRAINING_PRODUCTS = {
    FEATURED_60: {
        name: "Featured Training Program (60 Days)",
        price: 15000, // $150.00 CAD
        duration: 60, // days
        featured: true,
        description: "Boost your training program visibility with featured badge and priority placement for 60 days. Listing is always free.",
    },
    FEATURED_90: {
        name: "Featured Training Program (90 Days)",
        price: 22500, // $225.00 CAD
        duration: 90, // days
        featured: true,
        description: "Extended visibility with featured badge and top positioning for 90 days. Listing is always free.",
    },
} as const;

export type TrainingProductType = keyof typeof TRAINING_PRODUCTS;

// Talent Pool Access products (for viewing resumes and messaging candidates)
export const TALENT_POOL_PRODUCTS = {
    MONTHLY: {
        name: "Talent Pool Access - Monthly",
        price: 9900, // $99.00 CAD per month
        duration: 30, // days
        description: "Access Indigenous talent pool, view resumes, and message candidates directly",
        features: [
            "View all community member resumes",
            "Unlimited direct messaging to candidates",
            "Search and filter talent by skills and location",
            "Download resumes for offline review",
        ],
    },
    ANNUAL: {
        name: "Talent Pool Access - Annual",
        price: 89900, // $899.00 CAD per year (save ~$290)
        duration: 365, // days
        description: "Full year of talent pool access with priority support",
        features: [
            "All monthly features included",
            "Priority customer support",
            "Save $290 vs monthly billing",
            "Early access to new talent features",
        ],
    },
} as const;

export type TalentPoolProductType = keyof typeof TALENT_POOL_PRODUCTS;

// School/Education Institution products
export const SCHOOL_PRODUCTS = {
    BASIC: {
        name: "Basic School Profile",
        price: 0, // FREE
        duration: 365, // days
        featured: false,
        description: "List your school for free with essential features",
        features: [
            "School profile page",
            "Up to 3 program listings",
            "1 scholarship listing",
            "Basic contact information",
            "Standard directory placement",
        ],
        programLimit: 3,
        scholarshipLimit: 1,
        jobCredits: 0,
    },
    STANDARD: {
        name: "Standard School Plan",
        price: 50000, // $500.00 per year
        duration: 365, // days
        featured: false,
        description: "Grow your reach with unlimited programs and job posting credits",
        features: [
            "Everything in Basic",
            "Unlimited program listings",
            "Up to 5 scholarship listings",
            "3 job posting credits",
            "Featured in school directory",
            "School logo & branding",
            "Inquiry management dashboard",
        ],
        programLimit: -1, // unlimited
        scholarshipLimit: 5,
        jobCredits: 3,
    },
    PREMIUM: {
        name: "Premium School Plan",
        price: 150000, // $1,500.00 per year
        duration: 365, // days
        featured: true,
        description: "Maximum visibility with unlimited everything and premium features",
        features: [
            "Everything in Standard",
            "Unlimited scholarships",
            "Unlimited job postings",
            "Homepage featured placement",
            "Recruitment event listings",
            "Advanced analytics dashboard",
            "Priority customer support",
            "Social media promotion",
        ],
        programLimit: -1, // unlimited
        scholarshipLimit: -1, // unlimited
        jobCredits: -1, // unlimited
    },
    ENTERPRISE: {
        name: "Enterprise School Plan",
        price: 300000, // $3,000.00 per year
        duration: 365, // days
        featured: true,
        description: "Custom solution for multi-campus institutions",
        features: [
            "Everything in Premium",
            "Multi-campus support",
            "Dedicated account manager",
            "Custom integrations",
            "API access",
            "Co-branded recruitment events",
            "Quarterly strategy sessions",
            "Custom reporting",
        ],
        programLimit: -1,
        scholarshipLimit: -1,
        jobCredits: -1,
    },
} as const;

export type SchoolProductType = keyof typeof SCHOOL_PRODUCTS;

// School add-on products (à la carte)
export const SCHOOL_ADDON_PRODUCTS = {
    SINGLE_JOB: {
        name: "Single Job Post (School Rate)",
        price: 10000, // $100.00 - discounted from $125
        duration: 30,
        description: "Post a single job at the discounted school rate",
    },
    FEATURED_PROGRAM: {
        name: "Featured Program (60 Days)",
        price: 7500, // $75.00
        duration: 60,
        description: "Boost a program with featured badge and priority placement",
    },
    ADDITIONAL_SCHOLARSHIP: {
        name: "Additional Scholarship Listing",
        price: 2500, // $25.00
        duration: 365,
        description: "Add more scholarship listings beyond your plan limit",
    },
    RECRUITMENT_EVENT: {
        name: "Recruitment Event Listing",
        price: 15000, // $150.00
        duration: 90,
        description: "List and promote a recruitment event, open house, or info session",
    },
} as const;

export type SchoolAddonProductType = keyof typeof SCHOOL_ADDON_PRODUCTS;

