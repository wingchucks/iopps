import test from "node:test";
import assert from "node:assert/strict";
import { CANADIAN_PROVINCES, matchesCanadianLocation } from "../src/lib/canadian-provinces.ts";
import { normalizeOrganizationLocation } from "../src/lib/organization-profile.ts";
import { normalizeJobDiscoveryMetadata } from "../src/lib/job-metadata.ts";
import { salaryInfo } from "../src/lib/job-discovery.ts";
import { salaryRangeError } from "../src/lib/salary-range.ts";
import { isPlanAvailableForPurchase, getPlanById } from "../src/lib/pricing.ts";
import { dedupeEventDirectory } from "../src/lib/event-directory-dedupe.ts";
import { publicOpportunityRecord } from "../src/lib/server/public-opportunities.ts";
import { ownedPersonalUpload } from "../src/lib/server/account-upload-cleanup.ts";

test("province searches accept names/codes without matching letters inside cities", () => {
  for (const [code, name] of CANADIAN_PROVINCES) {
    assert.ok(matchesCanadianLocation(`City, ${code}, CA`, name));
    assert.ok(matchesCanadianLocation({ province: name, city: "City" }, code));
  }
  for (const city of ["Vernon, BC", "Saskatoon, SK", "Moncton, NB"]) assert.equal(matchesCanadianLocation(city, "ON"), false);
  assert.ok(matchesCanadianLocation("Toronto, ON, CA", "Toronto Ontario"));
  assert.ok(matchesCanadianLocation("Montréal, QC", "Montreal"));
  assert.ok(matchesCanadianLocation("Montréal, QC", "Québec"));
  assert.deepEqual(normalizeOrganizationLocation("Saskatchewan, Canada"), { city: "", province: "Saskatchewan" });
});

test("explicit remote work and disclosed compensation become discoverable without invented pay periods", () => {
  const job = { id: "qa", title: "Advisor", remoteFlag: false, description: "This is a fully remote position. Expected Compensation: The expected hiring range for this role is $51,000 - $54,000 based on a 35-hour work week." };
  const normalized = normalizeJobDiscoveryMetadata(job);
  assert.equal(normalized.remoteFlag, true);
  assert.equal(salaryInfo(normalized)?.min, 51000);
  assert.equal(salaryInfo(normalized)?.max, 54000);
  assert.equal(salaryInfo(normalized)?.period, "unknown");
  assert.equal(normalizeJobDiscoveryMetadata({ ...job, workLocation: "On-site" }).remoteFlag, false);
  assert.equal(normalizeJobDiscoveryMetadata({ ...job, description: "This is not a fully remote position." }).remoteFlag, false);
  assert.equal(salaryInfo({ ...job, salaryRange: { disclosed: false } }), null);
  assert.equal(salaryInfo({ id: "qa", title: "Hourly", salary: "$25 - $30", salaryRange: { min: 25, max: 30, period: "Hourly" } })?.display, "$25 - $30 / hour");
});

test("salary validation rejects negative, inverted and non-numeric ranges", () => {
  assert.ok(salaryRangeError({ min: 90000, max: 50000 }));
  assert.ok(salaryRangeError({ min: -1, max: 20 }));
  assert.ok(salaryRangeError({ min: 10, max: Infinity }));
  assert.ok(salaryRangeError({ min: "10", max: 20 }));
  assert.equal(salaryRangeError({ min: 25, max: 25 }), null);
  assert.equal(salaryRangeError(null), null);
});

test("retired sales cannot be purchased while historical receipts still resolve", () => {
  for (const plan of ["tier3", "program-post"]) { assert.equal(isPlanAvailableForPurchase(plan), false); assert.ok(getPlanById(plan)); }
  for (const plan of ["tier1", "tier2", "standard-post", "featured-post"]) assert.equal(isPlanAvailableForPurchase(plan), true);
});

test("official event sources survive projection; only equivalent dated events combine", () => {
  const raw = { id: "one", title: "4th National Climate Gathering: Leadership", website: "https://events.example.org/events/climate", startDate: "2099-10-05", endDate: "2099-10-08", status: "active", secret: "PRIVATE" };
  const one = publicOpportunityRecord(raw, "events")!;
  assert.equal(one.sourceUrl, raw.website); assert.equal(one.secret, undefined);
  const two = { ...one, id: "two", title: "AFN 4th National Climate Gathering" };
  assert.equal(dedupeEventDirectory([one, two]).length, 1);
  assert.equal(dedupeEventDirectory([one, { ...two, startDate: "2099-11-05" }]).length, 2);
  assert.equal(dedupeEventDirectory([one, { ...two, title: "Different climate workshop" }]).length, 2);
  assert.equal(dedupeEventDirectory([{ ...one, sourceUrl: "https://events.example.org/" }, { ...two, sourceUrl: "https://events.example.org/" }]).length, 2);
});

test("upload cleanup can target only the closed account's personal namespace", () => {
  assert.equal(ownedPersonalUpload("avatars/qa-one.png", "qa-one"), true);
  assert.equal(ownedPersonalUpload("resumes/qa-one/resume.pdf", "qa-one"), true);
  assert.equal(ownedPersonalUpload("avatars/qa-one-other.png", "qa-one"), false);
  assert.equal(ownedPersonalUpload("resumes/qa-one-other/resume.pdf", "qa-one"), false);
  assert.equal(ownedPersonalUpload("application-documents/qa-one/archive.pdf", "qa-one"), false);
  assert.equal(ownedPersonalUpload("resumes/../somebody/file.pdf", ".."), false);
});
