import test from "node:test";
import assert from "node:assert/strict";
import { validateOpportunity, fundingTypeLabel, scholarshipDeadlineType, plainOpportunityText, safeOpportunityUrl } from "../src/lib/opportunity-posting.ts";
import { matchesEventDate, matchesFundingDeadline, opportunityProvince } from "../src/lib/opportunity-discovery.ts";
import { createEventCalendar } from "../src/lib/event-calendar.ts";
import { getEventEndDate, getEventStartDate } from "../src/lib/public-events.ts";
import { mergeOpportunitySources, publicOpportunityRecord } from "../src/lib/server/public-opportunities.ts";

test("drafts allow incomplete content; publication checks date, location and application handoffs", () => {
  assert.deepEqual(validateOpportunity("events", { title: "Draft" }, "draft").errors, {});
  assert.ok(validateOpportunity("events", { title: "Incomplete" }, "active").errors.startDate);
  const valid = { title: "Gathering", description: "Meet your community", startDate: "2027-02-28", city: "Winnipeg", province: "Manitoba" };
  assert.deepEqual(validateOpportunity("events", valid, "active").errors, {});
  assert.equal(validateOpportunity("events", valid, "active").data.province, "MB");
  assert.ok(validateOpportunity("events", { ...valid, startDate: "2027-02-30" }, "active").errors.startDate);
  assert.ok(validateOpportunity("events", { ...valid, endDate: "2027-02-27" }, "active").errors.endDate);
  assert.ok(validateOpportunity("events", { ...valid, startTime: "13:00", endTime: "12:00" }, "active").errors.endTime);
  assert.ok(validateOpportunity("events", { title: "Online", description: "Info", startDate: "2027-03-01", delivery: "online" }, "active").errors.rsvpLink);
  const funding = { title: "Bursary", description: "Learning support", amount: "Amount varies", eligibility: "Provider requirements", externalUrl: "https://example.invalid/apply", howToApply: "Upload a statement", status: "active", featured: true, orgId: "forged", verified: true };
  const result = validateOpportunity("scholarships", funding, "active");
  assert.deepEqual(result.errors, {}); assert.equal(result.data.applicationUrl, funding.externalUrl); assert.equal(result.data.applicationInstructions, funding.howToApply);
  assert.equal(result.data.featured, undefined); assert.equal(result.data.orgId, undefined); assert.equal(result.data.verified, undefined);
  assert.ok(validateOpportunity("scholarships", { ...funding, applicationUrl: "javascript:alert(1)" }, "active").errors.applicationUrl);
  assert.equal(validateOpportunity("scholarships", { title: "Edit" }, "draft", { businessPlanRequired: "Yes", industrySector: ["Design"] }).data.businessPlanRequired, "Yes");
});
test("unknown funding deadlines never imply rolling applications", () => {
  assert.equal(fundingTypeLabel({ title: "Education bursary", category: "Long imported prose about education eligibility" }), "Bursary");
  assert.equal(fundingTypeLabel({ title: "Funding program", category: "Business Grant" }), "Business Grant");
  assert.equal(fundingTypeLabel({ title: "Learning support", category: "Health / all fields" }), "Other Funding");
  for (const deadline of ["", "Check provider", "Varies", "Open", undefined]) assert.equal(scholarshipDeadlineType({ deadline }), "unknown");
  assert.equal(scholarshipDeadlineType({ deadline: "Rolling" }), "rolling");
  const now = new Date("2027-06-12T12:00:00");
  assert.equal(matchesFundingDeadline({ deadline: "2027-06-12" }, "closing", now), true);
  assert.equal(matchesFundingDeadline({ deadline: "2026-06-12" }, "closing", now), false);
  assert.equal(matchesFundingDeadline({}, "rolling", now), false);
  assert.equal(matchesFundingDeadline({}, "unknown", now), true);
});
test("event discovery includes multi-day events already in progress and excludes unknown dates from date promises", () => {
  const now = new Date("2027-06-12T12:00:00");
  const event = { startDate: "2027-06-11", endDate: "2027-06-13" };
  assert.equal(matchesEventDate(event, "week", now), true);
  assert.equal(matchesEventDate({ startDate: "2027-06-12" }, "upcoming", now), true);
  assert.equal(matchesEventDate({}, "upcoming", now), false);
  assert.equal(matchesEventDate({}, "unconfirmed", now), true);
  assert.equal(getEventStartDate({ startDate: "2027-02-31" }), null);
  assert.equal(getEventEndDate({ dates: "June 11–13, 2027" })?.getDate(), 13);
  assert.equal(opportunityProvince({ location: "Winnipeg, MB" }), "MB");
});
test("calendar downloads use actual dates, exclusive final date, escaped text and UTF-8 line folding", () => {
  const calendar = createEventCalendar({ id: "example", title: "Gathering, learning; together\nNew line " + "é".repeat(100), description: "A community gathering", startDate: "2027-12-31", endDate: "2028-01-02" }, new Date("2026-01-01T00:00:00Z"));
  assert.ok(calendar); assert.match(calendar, /DTSTART;VALUE=DATE:20271231\r\n/); assert.match(calendar, /DTEND;VALUE=DATE:20280103\r\n/);
  assert.match(calendar, /Gathering\\, learning\\; together\\nNew line/);
  assert.ok(calendar.split("\r\n").every(line => Buffer.byteLength(line, "utf8") <= 75));
  assert.equal(createEventCalendar({ title: "Unscheduled" }), null);
  assert.match(createEventCalendar({ title: "One day", startDate: "2027-06-12" })!, /DTEND;VALUE=DATE:20270613/);
});
test("public sources cannot resurrect drafts or disclose owner-only fields", () => {
  const merged = mergeOpportunitySources([{ id: "id1", slug: "old-listing", status: "draft", active: false }], [{ id: "event-old-listing", slug: "old-listing", title: "Old public copy" }], "events");
  assert.equal(merged.length, 1); assert.equal(publicOpportunityRecord(merged[0], "events"), null);
  for (const status of ["draft", "closed", "rejected", "pending", "flagged"]) assert.equal(publicOpportunityRecord({ id: "x", title: "Private", status }, "scholarships"), null);
  assert.equal(publicOpportunityRecord({ id: "conference", title: "Conference", status: "active", startDate: "2027-06-12", location: "Calgary, AB", province: "AB" }, "events")?.location, "Calgary, AB");
  assert.equal(publicOpportunityRecord({ id: "gathering", title: "Gathering", startDate: "2027-06-12", location: "Use the east entrance", city: "Winnipeg", province: "MB" }, "events")?.location, "Use the east entrance, Winnipeg, MB");
  const record = publicOpportunityRecord({ id: "x", title: "Public", status: "active", externalUrl: "https://example.invalid/apply", howToApply: "Apply here", privateNotes: "CANARY", billingEmail: "CANARY", employerId: "org", organization: "Provider", description: '<p>Hello</p><script>alert(1)</script>' }, "scholarships")!;
  assert.equal(record.applicationUrl, "https://example.invalid/apply"); assert.equal(record.applicationInstructions, "Apply here"); assert.equal(record.orgName, "Provider");
  assert.ok(!JSON.stringify(record).includes("CANARY")); assert.equal(record.description, "Hello");
  assert.equal(safeOpportunityUrl("data:text/html,hello"), ""); assert.equal(plainOpportunityText('<img src=x onerror=alert(1)>Text'), "Text");
});
