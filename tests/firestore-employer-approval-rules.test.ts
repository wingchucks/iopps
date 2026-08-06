import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");

function block(start: string, end: string): string {
  const startIndex = rules.indexOf(start);
  const endIndex = rules.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing rules block: ${start}`);
  assert.notEqual(endIndex, -1, `Missing rules boundary: ${end}`);
  return rules.slice(startIndex, endIndex);
}

test("Firestore rules define approval and protected-field guards", () => {
  assert.match(rules, /function isApprovedOrganization\(orgId\)/);
  assert.match(rules, /function preservesEmployerApproval\(\)/);
  assert.match(rules, /function preservesUserPrivileges\(\)/);
  assert.match(rules, /'status', 'verified', 'approvedAt', 'rejectionReason'/);
  assert.match(rules, /'role', 'admin', 'employerId', 'orgId', 'orgRole'/);
});

test("direct employer and organization creation is admin-only", () => {
  const employers = block("match /employers/{employerId}", "match /users/{userId}");
  const organizations = block("match /organizations/{orgId}", "match /shop_vendors/{vendorId}");

  assert.match(employers, /allow create: if isAdmin\(\);/);
  assert.match(employers, /preservesEmployerApproval\(\)/);
  assert.match(organizations, /allow create: if isAdmin\(\);/);
  assert.match(organizations, /preservesEmployerApproval\(\)/);
});

test("organization content requires an approved employer record", () => {
  for (const [start, end] of [
    ["match /jobs/{jobId}", "match /employers/{employerId}"],
    ["match /scholarships/{scholarshipId}", "match /conferences/{conferenceId}"],
    ["match /conferences/{conferenceId}", "match /events/{eventId}"],
    ["match /events/{eventId}", "match /rssFeeds/{feedId}"],
  ]) {
    const contentBlock = block(start, end);
    assert.match(contentBlock, /isApprovedOrganization\(request\.resource\.data\.orgId\)/);
    assert.match(contentBlock, /isApprovedOrganization\(resource\.data\.orgId\)/);
  }
});

test("pending organization members cannot publish through the community post path", () => {
  const posts = block("match /posts/{postId}", "match /organizations/{orgId}");
  assert.match(posts, /!hasOrganizationMembership\(\)/);
  assert.match(posts, /isApprovedOrganization\(request\.resource\.data\.orgId\)/);
  assert.match(posts, /isApprovedOrganization\(resource\.data\.orgId\)/);
});

test("users cannot self-escalate user or member security fields", () => {
  const users = block("match /users/{userId}", "match /scholarships/{scholarshipId}");
  const members = block("match /members/{userId}", "match /saved_items/{itemId}");

  assert.match(users, /createsWithoutUserPrivileges\(\)/);
  assert.match(users, /preservesUserPrivileges\(\)/);
  assert.match(members, /createsWithoutUserPrivileges\(\)/);
  assert.match(members, /preservesUserPrivileges\(\)/);
});
