import Stripe from "stripe";

// Initialize Stripe with a dummy key for build time if missing
// This prevents build failures when env vars aren't fully loaded yet
const stripeKey = process.env.STRIPE_SECRET_KEY || "dummy_key_for_build";

export const stripe = new Stripe(stripeKey, {
    apiVersion: "2025-11-17.clover",
    typescript: true,
});

// Job posting product configurations
export const JOB_POSTING_PRODUCTS = {
    SINGLE: {
        name: "Single Job Post",
        price: 12500, // $125.00
        duration: 30, // days
        featured: false,
        description: "1 job posting live for 30 days with standard placement",
    },
    FEATURED: {
        name: "Featured Job Ad",
        price: 30000, // $300.00
        duration: 45, // days
        featured: true,
        description: 'Posted for 45 days with "Featured" spotlight placement, employer logo & branding, and analytics',
    },
} as const;

export type JobPostingProductType = keyof typeof JOB_POSTING_PRODUCTS;

// Conference/Event product configurations
export const CONFERENCE_PRODUCTS = {
    FREE: {
        name: "Free Conference Listing",
        price: 0, // Free
        duration: 60, // days
        featured: false,
        description: "Basic conference listing visible for 60 days",
    },
    PREMIUM: {
        name: "Premium Conference Listing",
        price: 15000, // $150.00
        duration: 90, // days
        featured: false,
        description: "Enhanced listing with priority placement for 90 days",
    },
    FEATURED: {
        name: "Featured Conference Spotlight",
        price: 35000, // $350.00
        duration: 120, // days
        featured: true,
        description: "Premium spotlight placement with banner image, featured badge, and top positioning for 120 days",
    },
} as const;

export type ConferenceProductType = keyof typeof CONFERENCE_PRODUCTS;

