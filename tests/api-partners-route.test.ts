import test from "node:test";
import assert from "node:assert/strict";

import { buildPartnersPayload } from "../src/app/api/partners/route.ts";

test("/api/partners excludes SIIT-style trials and Nicaw-style admin grants", () => {
  const payload = buildPartnersPayload([
    {
      id: "paid-premium",
      name: "Paid Premium Partner",
      type: "business",
      status: "approved",
      onboardingComplete: true,
      logoUrl: "https://cdn.example.com/paid-premium.png",
      description: "Public premium partner profile.",
      contactEmail: "paid@example.com",
      publicVisibility: "public",
      subscription: {
        tier: "premium",
        status: "active",
        billingStartAt: "2026-01-01T00:00:00.000Z",
        subscriptionEnd: "2026-12-31T00:00:00.000Z",
        paymentId: "pi_paid",
        amountPaid: 2500,
      },
    },
    {
      id: "siit-trial",
      name: "SIIT",
      type: "school",
      status: "approved",
      publicVisibility: "public",
      subscription: {
        tier: "school",
        status: "trialing",
        billingStartAt: "2026-03-01T00:00:00.000Z",
        subscriptionEnd: "2026-05-01T00:00:00.000Z",
      },
    },
    {
      id: "nicaw-admin-grant",
      name: "Nicawicikanisihk Wellness Centre",
      type: "business",
      status: "approved",
      onboardingComplete: true,
      logoUrl: "https://cdn.example.com/nicaw.png",
      description: "Complimentary admin-grant profile.",
      contactEmail: "nicaw@example.com",
      publicVisibility: "public",
      subscription: {
        tier: "premium",
        status: "active",
        billingStartAt: "2026-01-01T00:00:00.000Z",
        subscriptionEnd: "2026-12-31T00:00:00.000Z",
        paymentId: "admin-grant-tier2",
        amountPaid: 0,
      },
    },
  ]);

  const names = payload.partners.map((partner) => String(partner.name));

  assert.deepEqual(names, ["Paid Premium Partner"]);
  assert.equal(payload.groups.premium.length, 1);
  assert.equal(payload.groups.school.length, 0);
  assert.equal(payload.groups.standard.length, 0);
});

test("/api/partners dedupes legacy alias partner records and keeps the canonical public entry", () => {
  const payload = buildPartnersPayload([
    {
      id: "UyTZcF7xEiRmBnSEzcSMmw9MXvL2",
      name: "Westland Insurance Group Ltd.",
      slug: "westland-insurance-phd5mi",
      type: "business",
      status: "approved",
      onboardingComplete: true,
      logoUrl: "https://cdn.example.com/westland.png",
      description: "Canonical public partner profile.",
      contactEmail: "westland@example.com",
      website: "https://example.com/westland",
      publicVisibility: "public",
      isPublished: true,
      publicationStatus: "PUBLISHED",
      directoryVisible: true,
      isDirectoryVisible: true,
      subscription: {
        tier: "premium",
        status: "active",
        billingStartAt: "2026-01-01T00:00:00.000Z",
        subscriptionEnd: "2026-12-31T00:00:00.000Z",
        paymentId: "pi_westland",
        amountPaid: 2500,
      },
    },
    {
      id: "westland-insurance",
      employerId: "UyTZcF7xEiRmBnSEzcSMmw9MXvL2",
      name: "Westland Insurance Group Ltd.",
      slug: "westland-insurance",
      type: "business",
      status: "approved",
      onboardingComplete: true,
      logoUrl: "https://cdn.example.com/westland-old.png",
      description: "Legacy alias record that should not duplicate the canonical org.",
      contactEmail: "westland-old@example.com",
      publicVisibility: "public",
      subscription: {
        tier: "premium",
        status: "active",
        billingStartAt: "2026-01-01T00:00:00.000Z",
        subscriptionEnd: "2026-12-31T00:00:00.000Z",
        paymentId: "pi_westland_old",
        amountPaid: 2500,
      },
    },
    {
      id: "tsRvNLiRWARbOoiBOiEVFDwFfZn2",
      name: "Saskatoon Tribal Council",
      slug: "saskatoon-tribal-council-s81luo",
      type: "business",
      status: "approved",
      onboardingComplete: true,
      logoUrl: "https://cdn.example.com/stc.png",
      description: "Canonical public partner profile.",
      contactEmail: "stc@example.com",
      publicVisibility: "public",
      isPublished: true,
      publicationStatus: "PUBLISHED",
      directoryVisible: true,
      isDirectoryVisible: true,
      subscription: {
        tier: "premium",
        status: "active",
        billingStartAt: "2026-01-01T00:00:00.000Z",
        subscriptionEnd: "2026-12-31T00:00:00.000Z",
        paymentId: "pi_stc",
        amountPaid: 2500,
      },
    },
    {
      id: "saskatoon-tribal-council",
      name: "Saskatoon Tribal Council",
      slug: "saskatoon-tribal-council",
      type: "business",
      status: "approved",
      onboardingComplete: true,
      logoUrl: "https://cdn.example.com/stc-old.png",
      description: "Legacy alias record that should collapse into the canonical slug.",
      contactEmail: "stc-old@example.com",
      publicVisibility: "public",
      subscription: {
        tier: "premium",
        status: "active",
        billingStartAt: "2026-01-01T00:00:00.000Z",
        subscriptionEnd: "2026-12-31T00:00:00.000Z",
        paymentId: "pi_stc_old",
        amountPaid: 2500,
      },
    },
  ]);

  assert.deepEqual(
    payload.partners.map((partner) => String(partner.id)),
    ["tsRvNLiRWARbOoiBOiEVFDwFfZn2", "UyTZcF7xEiRmBnSEzcSMmw9MXvL2"],
  );
  assert.deepEqual(
    payload.partners.map((partner) => String(partner.name)),
    ["Saskatoon Tribal Council", "Westland Insurance Group Ltd."],
  );
});

test("/api/partners restores City of Saskatoon as a legacy public partner", () => {
  const payload = buildPartnersPayload([
    {
      id: "vAhCU0qrmpRaWCHHWOpbhvx3u9h1",
      name: "City of Saskatoon",
      slug: "city-of-saskatoon-n0w2ko",
      onboardingComplete: true,
    },
  ]);

  assert.deepEqual(
    payload.partners.map((partner) => String(partner.name)),
    ["City of Saskatoon"],
  );
  assert.equal(payload.partners[0]?.partnerTier, "premium");
  assert.equal(payload.partners[0]?.partnerEligibilityReason, "legacy_directory_partner");
  assert.equal(payload.groups.premium.length, 1);
});
