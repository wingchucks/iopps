import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLoginRedirectHref,
  isMailtoHref,
  normalizeApplyUrlFields,
  normalizeExternalHref,
} from "../src/lib/utils.ts";

test("prefixes bare email addresses with mailto", () => {
  const href = normalizeExternalHref("careers@onionlakehealth.org");

  assert.equal(href, "mailto:careers@onionlakehealth.org");
  assert.equal(isMailtoHref(href), true);
});

test("prefixes bare domains with https", () => {
  assert.equal(normalizeExternalHref("example.com/apply"), "https://example.com/apply");
});

test("keeps explicit schemes unchanged", () => {
  assert.equal(normalizeExternalHref("https://example.com/apply"), "https://example.com/apply");
  assert.equal(isMailtoHref("https://example.com/apply"), false);
});

test("leaves internal paths untouched", () => {
  assert.equal(normalizeExternalHref("/jobs/program-coordinator"), "/jobs/program-coordinator");
});

test("builds a login redirect href for protected routes", () => {
  assert.equal(
    buildLoginRedirectHref("/jobs/program-coordinator-mo1vnx15/apply"),
    "/login?redirect=%2Fjobs%2Fprogram-coordinator-mo1vnx15%2Fapply",
  );
});

test("normalizes bare email application fields on API records", () => {
  const record = normalizeApplyUrlFields({
    applicationUrl: "careers@onionlakehealth.org",
    externalApplyUrl: "careers@onionlakehealth.org",
  });

  assert.equal(record.applicationUrl, "mailto:careers@onionlakehealth.org");
  assert.equal(record.externalApplyUrl, "mailto:careers@onionlakehealth.org");
});
