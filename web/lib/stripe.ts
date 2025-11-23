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
