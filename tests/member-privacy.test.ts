import test from "node:test";
import assert from "node:assert/strict";
import { visibleMemberProfile } from "../src/lib/server/member-privacy.ts";
const profile = { displayName: "Fictional member", email: "private@example.invalid", resumeUrl: "PRIVATE_RESUME", salaryRange: "PRIVATE_SALARY", admin: true, orgId: "PRIVATE_ORG", bio: "Public bio", location: "Saskatoon" };

test("member projections exclude private fields and honor per-field audience", () => {
  const publicView = visibleMemberProfile("member", profile, {}, {}, false)!;
  assert.equal(publicView.bio, "Public bio");
  for (const field of ["email", "resumeUrl", "salaryRange", "admin", "orgId", "location"]) assert.equal(publicView[field], undefined);
  const signedIn = visibleMemberProfile("member", profile, {}, {}, true)!;
  assert.equal(signedIn.location, "Saskatoon");
  assert.equal(signedIn.email, undefined);
  assert.equal(visibleMemberProfile("member", profile, { fieldVisibility: { email: "members", bio: "only_me" } }, {}, true)!.email, profile.email);
  assert.equal(visibleMemberProfile("member", profile, { fieldVisibility: { bio: "only_me" } }, {}, true)!.bio, undefined);
});
test("private, hidden, disabled, and suspended profiles are not exposed by the directory or metadata", () => {
  for (const signedIn of [false, true]) assert.equal(visibleMemberProfile("member", profile, { profileVisibility: "private" }, {}, signedIn), null);
  assert.equal(visibleMemberProfile("member", profile, { profileVisibility: "members_only" }, {}, false), null);
  assert.equal(visibleMemberProfile("member", profile, { showInDirectory: false }, {}, true, true), null);
  assert.equal(visibleMemberProfile("member", { ...profile, hideFromDirectory: true }, {}, {}, true, true), null);
  for (const status of ["suspended", "disabled", "deleted"]) assert.equal(visibleMemberProfile("member", profile, {}, { status }, true), null);
});
