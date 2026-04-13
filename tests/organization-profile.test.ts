import test from "node:test";
import assert from "node:assert/strict";

import {
  formatOrganizationHoursDay,
  getBusinessProfileReadiness,
  hasOrganizationIndigenousIdentity,
  isOrganizationPubliclyVisible,
  normalizeOrganizationLocation,
  normalizeOrganizationProfilePatch,
  normalizeOrganizationRecord,
} from "../src/lib/organization-profile.ts";

test("normalizeOrganizationLocation converts legacy strings to object form", () => {
  assert.deepEqual(normalizeOrganizationLocation("Regina, Saskatchewan"), {
    city: "Regina",
    province: "Saskatchewan",
  });
  assert.deepEqual(normalizeOrganizationLocation({ city: "Calgary", province: "Alberta", remote: true }), {
    city: "Calgary",
    province: "Alberta",
    remote: true,
  });
});

test("normalizeOrganizationRecord preserves normalized media and social fields", () => {
  const normalized = normalizeOrganizationRecord({
    id: "org-1",
    name: "  Northern Lights Careers  ",
    logo: "https://cdn.example.com/logo.png",
    location: "Winnipeg, Manitoba",
    socialLinks: {
      instagram: "instagram.com/northernlights",
      twitter: "x.com/northernlights",
      tiktok: "ignored",
    },
  });

  assert.equal(normalized.name, "Northern Lights Careers");
  assert.equal(normalized.logoUrl, "https://cdn.example.com/logo.png");
  assert.deepEqual(normalized.location, {
    city: "Winnipeg",
    province: "Manitoba",
  });
  assert.deepEqual(normalized.socialLinks, {
    instagram: "instagram.com/northernlights",
    twitter: "x.com/northernlights",
  });
});

test("normalizeOrganizationProfilePatch supports normalized partial writes", () => {
  const { updates, touchedFields } = normalizeOrganizationProfilePatch({
    foundedYear: "2004",
    isPublished: false,
    location: "Saskatoon, Saskatchewan",
    socialLinks: {
      linkedin: "linkedin.com/company/iopps",
      facebook: "facebook.com/iopps",
      tiktok: "should-not-be-written",
    },
    hours: {
      monday: { open: "9:00 AM", close: "5:00 PM", isOpen: true },
      sunday: "Closed",
    },
  });

  assert.deepEqual(touchedFields, ["foundedYear", "isPublished", "location", "hours", "socialLinks"]);
  assert.equal(updates.foundedYear, 2004);
  assert.equal(updates.isPublished, false);
  assert.deepEqual(updates.location, {
    city: "Saskatoon",
    province: "Saskatchewan",
  });
  assert.deepEqual(updates.socialLinks, {
    linkedin: "linkedin.com/company/iopps",
    facebook: "facebook.com/iopps",
  });
  assert.equal(formatOrganizationHoursDay((updates.hours as Record<string, unknown>).monday), "9:00 AM - 5:00 PM");
  assert.equal(formatOrganizationHoursDay((updates.hours as Record<string, unknown>).sunday), "Closed");
});

test("hasOrganizationIndigenousIdentity detects multiple signal shapes", () => {
  assert.equal(
    hasOrganizationIndigenousIdentity({
      tags: ["Indigenous-Owned Business"],
    }),
    true,
  );
  assert.equal(
    hasOrganizationIndigenousIdentity({
      nation: "Cree Nation",
    }),
    true,
  );
  assert.equal(
    hasOrganizationIndigenousIdentity({
      businessIdentity: "non_indigenous",
      tags: ["Recruitment"],
    }),
    false,
  );
});

test("isOrganizationPubliclyVisible only allows public-ready business organizations", () => {
  assert.equal(
    isOrganizationPubliclyVisible({
      type: "business",
      onboardingComplete: false,
      verified: false,
      status: "pending",
    }),
    false,
  );

  assert.equal(
    isOrganizationPubliclyVisible({
      type: "business",
      onboardingComplete: false,
      verified: false,
      status: "approved",
      logoUrl: "https://cdn.example.com/logo.png",
      description: "Indigenous emergency response services.",
      contactEmail: "team@example.com",
    }),
    true,
  );

  assert.equal(
    isOrganizationPubliclyVisible({
      type: "business",
      onboardingComplete: true,
      verified: false,
      status: "approved",
      logoUrl: "https://cdn.example.com/logo.png",
      description: "Indigenous emergency response services.",
      contactEmail: "team@example.com",
    }),
    true,
  );

  assert.equal(
    isOrganizationPubliclyVisible({
      type: "business",
      onboardingComplete: false,
      verified: false,
      status: "approved",
      description: "Accepted but incomplete business profile.",
      contactEmail: "team@example.com",
    }),
    false,
  );

  assert.equal(
    isOrganizationPubliclyVisible({
      type: "school",
      onboardingComplete: false,
      verified: false,
      status: "approved",
    }),
    true,
  );

  assert.equal(
    isOrganizationPubliclyVisible({
      type: "business",
      onboardingComplete: true,
      verified: true,
      status: "disabled",
      logoUrl: "https://cdn.example.com/logo.png",
      description: "Disabled organization.",
      contactEmail: "team@example.com",
    }),
    false,
  );
});

test("public visibility honors explicit hidden flags even for approved organizations", () => {
  const visible = isOrganizationPubliclyVisible({
    description: "Visible profile",
    logoUrl: "https://example.com/logo.png",
    website: "https://example.com",
    onboardingComplete: true,
    status: "approved",
    publicVisibility: "hidden",
  });

  assert.equal(visible, false);
});

test("getBusinessProfileReadiness requires logo, story, and contact for businesses", () => {
  assert.deepEqual(
    getBusinessProfileReadiness({
      type: "business",
      description: "",
      contactEmail: "",
      logoUrl: "",
    }),
    {
      isReady: false,
      missingFields: ["logo", "description", "contact"],
    },
  );

  assert.deepEqual(
    getBusinessProfileReadiness({
      type: "business",
      logoUrl: "https://cdn.example.com/logo.png",
      description: "Emergency response services for northern communities.",
      contactEmail: "team@example.com",
    }),
    {
      isReady: true,
      missingFields: [],
    },
  );
});

test("normalizeOrganizationRecord preserves partner directory metadata", () => {
  const normalized = normalizeOrganizationRecord({
    partnerDirectory: {
      enabled: true,
      visibleAt: "2026-04-12T12:00:00.000Z",
      sectionOverride: "premium",
      spotlight: false,
    },
  });

  assert.deepEqual(normalized.partnerDirectory, {
    enabled: true,
    visibleAt: "2026-04-12T12:00:00.000Z",
    sectionOverride: "premium",
    spotlight: false,
  });
});
