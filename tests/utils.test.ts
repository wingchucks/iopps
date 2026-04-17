import test from "node:test";
import assert from "node:assert/strict";
import { isMailtoHref, normalizeExternalHref } from "../src/lib/utils.ts";

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
