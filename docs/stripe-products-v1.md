# Stripe Products & Pricing - V1 Baseline

> Extracted from `web/lib/stripe.ts` on 2026-02-14.
> All prices in CAD. Amounts shown in cents and dollars.

## Job Posting Products (`JOB_POSTING_PRODUCTS`)

| Key | Name | Price | Duration | Featured | Job Credits | Talent Pool Days |
|-----|------|-------|----------|----------|-------------|------------------|
| `SINGLE` | Single Job Post | $125.00 (12500) | 30 days | No | 1 | 0 |
| `FEATURED` | Featured Job Ad | $300.00 (30000) | 45 days | Yes | 1 | 7 |

## Subscription Products (`SUBSCRIPTION_PRODUCTS`)

| Key | Name | Price | Duration | Featured | Job Credits | Featured Job Credits | Unlimited Posts | Talent Pool Days |
|-----|------|-------|----------|----------|-------------|----------------------|-----------------|------------------|
| `TIER1` | Growth | $1,250.00 (125000) | 365 days | No | 15 | 15 | No | 0 |
| `TIER2` | Unlimited | $2,500.00 (250000) | 365 days | Yes | Unlimited (-1) | 5 | Yes | 30 |

### TIER1 (Growth) Features
- 15 job postings per year
- Standard placement
- Basic organization profile page
- Access to posting analytics
- 15 Featured Job Listings included
- Logo on homepage Partner Carousel

### TIER2 (Unlimited) Features
- Unlimited job postings for 12 months
- Organization branding on postings
- Logo on homepage Partner Carousel
- Rotating featured listings on homepage & job board
- Candidate engagement analytics
- Standard customer support
- Rotating Featured Jobs included
- Shop Indigenous listing included
- 30 days Talent Pool Access included

## Conference Products (`CONFERENCE_PRODUCTS`)

> NOTE: Conference posting is FREE. These are visibility upgrades only.

| Key | Name | Price | Duration | Featured |
|-----|------|-------|----------|----------|
| `FEATURED_90` | Featured Conference (90 Days) | $250.00 (25000) | 90 days | Yes |
| `FEATURED_365` | Featured Conference Spotlight (365 Days) | $400.00 (40000) | 365 days | Yes |

## Vendor Products (`VENDOR_PRODUCTS`)

| Key | Name | Price | Duration | Featured | Recurring |
|-----|------|-------|----------|----------|-----------|
| `MONTHLY` | Featured Business | $25.00 (2500) | 30 days | Yes | Yes |

## Training Products (`TRAINING_PRODUCTS`)

> NOTE: Training program listing is FREE. These are visibility upgrades only.

| Key | Name | Price | Duration | Featured |
|-----|------|-------|----------|----------|
| `FEATURED_60` | Program Listing (60 Days) | $150.00 (15000) | 60 days | Yes |
| `FEATURED_90` | Program Listing (90 Days) | $225.00 (22500) | 90 days | Yes |

## Talent Pool Products (`TALENT_POOL_PRODUCTS`)

> NOTE: Feature temporarily disabled in UI but exports kept for build.

| Key | Name | Price | Duration |
|-----|------|-------|----------|
| `MONTHLY` | Talent Pool Monthly Access | $99.00 (9900) | 30 days |
| `ANNUAL` | Talent Pool Annual Access | $899.00 (89900) | 365 days |

### Monthly Features
- Browse all talent profiles
- Contact candidates directly
- Save favorite candidates
- Advanced search filters

### Annual Features
- Everything in Monthly
- Priority support
- Early access to new features
- Bulk messaging tools

## School Products (`SCHOOL_PRODUCTS`)

| Key | Name | Price | Duration | Featured | Trial Available | Trial Days |
|-----|------|-------|----------|----------|-----------------|------------|
| `PARTNER` | School Partner | $4,500.00 (450000) | 365 days | Yes | Yes | 90 |

### Partner Features
- Full school profile page
- Unlimited job postings
- Unlimited program listings
- Unlimited scholarship listings
- Unlimited training program listings
- Featured placement in school directory
- Homepage carousel rotation
- Recruitment event listings
- Analytics dashboard
- Priority support

## Stripe Configuration

- **API Version**: `2025-11-17.clover`
- **Secret Key Env Var**: `STRIPE_SECRET_KEY`
- **Note**: No Stripe product/price IDs are hardcoded. All products are defined as application-level configurations with prices in CAD cents. Stripe Checkout sessions are created dynamically at runtime using these configs.
