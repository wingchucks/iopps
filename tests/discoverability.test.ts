import test from "node:test";
import assert from "node:assert/strict";
import { isOrganizationPubliclyVisible } from "../src/lib/organization-profile.ts";
import {
  dedupeSitemap,
  isIndexableOrganization,
  isIndexableRecord,
  organizationPublicPath,
  publicPostPath,
  recordLastModified,
  safePublicSlug,
} from "../src/lib/server/discoverability.ts";

test("discoverability excludes explicit test, hidden, inactive, and expired records", () => {
  const now = new Date("2026-07-09T00:00:00Z");
  assert.equal(isIndexableRecord({ id: "ok", active: true }, now), true);
  assert.equal(isIndexableRecord({ id: "qa", isTest: true }, now), false);
  assert.equal(isIndexableRecord({ id: "draft", status: "draft" }, now), false);
  assert.equal(isIndexableRecord({ id: "off", active: false }, now), false);
  assert.equal(isIndexableRecord({ id: "old", endDate: "2026-01-01" }, now), false);
  assert.equal(isIndexableRecord({ id: "old-job", closingDate: "2026-01-01" }, now), false);
  assert.equal(isIndexableRecord({ id: "old-deadline", deadline: "2026-01-01" }, now), false);
  assert.equal(isIndexableRecord({ id: "old-event", endDate: { toDate: () => new Date("2026-01-01") } }, now), false);
  assert.equal(isIndexableRecord({ id: "qa-test-event-playwright-auto-c7b223c1" }, now), false);
  assert.equal(isIndexableRecord({ id: "tester", title: "Test Engineer" }, now), true);
});

test("organization sitemap records must be complete and publicly visible", () => {
  const complete = {
    id: "public-org",
    slug: "public-org",
    status: "approved",
    onboardingComplete: true,
    logoUrl: "https://example.com/logo.png",
    description: "A complete public organization profile.",
    contactEmail: "hello@example.com",
  };
  const publiclyVisible = (record: Record<string, unknown>) => isOrganizationPubliclyVisible(record);
  assert.equal(isIndexableOrganization(complete, publiclyVisible), true);
  assert.equal(isIndexableOrganization({ ...complete, status: "incomplete", onboardingComplete: false }, publiclyVisible), false);
  assert.equal(isIndexableOrganization({ ...complete, publicVisibility: "private" }, publiclyVisible), false);
});

test("public post paths cover event posts and canonical routes", () => {
  assert.equal(publicPostPath({ id: "event-summer-gathering", type: "event" }), "/events/summer-gathering");
  assert.equal(publicPostPath({ id: "conference-career-fair", type: "conference" }), "/events/career-fair");
  assert.equal(publicPostPath({ id: "job-current-role", type: "job" }), "/jobs/current-role");
  assert.equal(publicPostPath({ id: "other-record", type: "other" }), null);
});

test("slugs are safe and organizations use their real public route", () => {
  assert.equal(safePublicSlug({ slug: "../admin" }), null);
  assert.equal(organizationPublicPath({ slug: "first-nations-university", type: "school" }), "/schools/first-nations-university");
  assert.equal(organizationPublicPath({ slug: "siga", type: "employer" }), "/org/siga");
});

test("sitemap entries deduplicate and preserve source timestamps", () => {
  const older = new Date("2026-06-01");
  const newer = new Date("2026-07-01");
  const entries = dedupeSitemap([
    { url: "https://www.iopps.ca/events/a", lastModified: older },
    { url: "https://www.iopps.ca/events/a", lastModified: newer },
  ]);
  assert.equal(entries.length, 1);
  assert.equal(new Date(entries[0].lastModified!).toISOString(), newer.toISOString());
  assert.equal(recordLastModified({ updatedAt: "2026-07-02" })?.toISOString(), new Date("2026-07-02").toISOString());
});
