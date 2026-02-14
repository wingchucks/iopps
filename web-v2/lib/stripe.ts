/**
 * Stripe configuration
 *
 * This module will set up:
 * - Server-side Stripe SDK for creating checkout sessions, managing subscriptions
 * - Client-side Stripe.js for payment element rendering
 * - Webhook signature verification
 *
 * Environment variables required:
 * - STRIPE_SECRET_KEY (server-side)
 * - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (client-side)
 * - STRIPE_WEBHOOK_SECRET (webhook verification)
 */

// TODO: Initialize Stripe server and client instances
export const stripeConfig = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
};
