# Stripe Payment Integration

IOPPS sells paid job postings and annual employer plans through Stripe Checkout
(one-time `payment` mode sessions, CAD, 5% GST as a separate line item).

## Products

Prices and copy live in `src/lib/pricing.ts`; checkout and fulfillment never trust client amounts.

| Product (plan ID) | Price (CAD + GST) | What it grants |
|---|---|---|
| Standard Job Post (`standard-post`) | $125 | 1 standard posting credit (30-day listing) |
| Featured Job Post (`featured-post`) | $200 | 1 featured posting credit (listing of up to 45 days) |
| Standard plan (`tier1`) | $1,250/year | 15 job postings in the annual term |
| Premium plan (`tier2`) | $2,500/year | Unlimited job postings and 4 included featured slots |

`program-post` and the School plan (`tier3`) are retired for sale; existing receipts still fulfill and display.

## Files

- `src/app/api/stripe/checkout/route.ts` — `POST` creates a Checkout session for the organization
  owner (server-side amounts and metadata, fixed success/cancel URLs). `GET` returns the account's
  billing overview (current paid term, paid renewal, complimentary access, and which annual plans
  can be bought now) for the plan picker, billing page and checkout page.
- `src/app/api/stripe/webhook/route.ts` — verifies the raw-body signature and fulfills or revokes
  payments. Every Stripe event is claimed once (`stripeWebhookEvents/{eventId}`) in the same Firestore
  transaction as its effects; receipts are `subscriptions/{checkoutSessionId}`.
- `src/lib/server/paid-job-term.ts` / `paid-job-publication-reader.ts` — the paid term and credits
  that fund publication (`employers/{employerId}`, else `employers/{orgId}`).
- `src/app/api/cron/check-subscriptions/route.ts` — daily expiry (`CRON_SECRET`), which also promotes
  a paid renewal into the account projection when the renewed term ends.

## Webhook endpoint (required)

Production endpoint: `https://www.iopps.ca/api/stripe/webhook`

In the [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks), the endpoint
must be subscribed to **all four** events:

| Event | Effect |
|---|---|
| `checkout.session.completed` | Fulfills paid sessions; delayed payment methods (`payment_status: unpaid`) are deferred |
| `checkout.session.async_payment_succeeded` | Fulfills sessions paid by a delayed payment method (same session, granted once) |
| `charge.refunded` | Full refunds withdraw the purchase (partial refunds are acknowledged and left to the owner) |
| `charge.dispute.created` | A chargeback withdraws the purchase the same way as a full refund |

Copy the endpoint's signing secret into Vercel as `STRIPE_WEBHOOK_SECRET`. After adding the two
`charge.*` events, confirm on the endpoint page that the next deliveries succeed (2xx). Avoid
dashboard "Send test event" for `charge.*` events in live mode: synthetic payment intents are recorded
as unmatched revocations.

For local testing with the Stripe CLI:

```bash
stripe listen \
  --events checkout.session.completed,checkout.session.async_payment_succeeded,charge.refunded,charge.dispute.created \
  --forward-to localhost:3000/api/stripe/webhook
# Put the printed whsec_... in .env.local as STRIPE_WEBHOOK_SECRET
```

## Billing rules the code enforces

- **Annual terms** last exactly one calendar year from the moment they start, on the Saskatchewan
  (America/Regina) clock; February 29 ends on February 28.
- **No overlapping purchases.** While a paid annual term is active, checkout refuses another annual
  purchase (HTTP 409) except a **same-tier renewal during the last 60 days** of the term. A renewal
  starts when the current term ends, so no paid time is lost; listings funded by the earlier term stay
  editable until their own expiry. Mid-term plan changes are refused with "contact us to change plans"
  (annual plans are not prorated). If a payment for an annual plan still arrives during a paid term
  (for example an old open Checkout session), it is queued after the current term and flagged
  `reviewRequired` on its receipt instead of replacing anything.
- **Complimentary access** ($0 admin or Hermes grants) is not a paid plan and never funds job postings;
  buying a paid plan replaces it immediately.
- **Refunds and disputes.** The receipt is found by its stored `stripePaymentIntent` and marked
  `refunded` or `disputed`. If it funds the current annual term, that term ends now (the account and
  organization show Free/expired). A one-time purchase's credit is removed while it is still unused —
  never below zero — and published jobs are never changed. A refund or dispute that arrives before
  fulfillment is remembered in `stripeRevocations/{paymentIntent}` so the later fulfillment grants
  nothing. A dispute that is later won is **not** restored automatically: re-apply the term or credit
  from the admin tools.

## Environment variables (Vercel)

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (from the webhook endpoint above)
- `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (Firebase Admin service account)
- `CRON_SECRET` (daily subscription check)

## Testing

- Use test keys (`sk_test_…`) and the test card `4242 4242 4242 4242` before switching to live keys.
- Runtime tests: `tests/stripe-billing-lifecycle.test.ts` (runs locally) and the emulator-backed
  `tests/stripe-payment-emulator.test.ts` (CI).
