import test from "node:test";
import assert from "node:assert/strict";

import {
  hasLinkedOrganization,
  resolveLinkedOrganizationId,
} from "../src/lib/account-state.ts";

test("resolveLinkedOrganizationId prefers member org id, then user org id, then employer id, then claims", () => {
  assert.equal(
    resolveLinkedOrganizationId({
      memberOrgId: "member-org",
      userOrgId: "user-org",
      userEmployerId: "employer-id",
      claimOrgId: "claim-org",
      claimEmployerId: "claim-employer",
    }),
    "member-org",
  );

  assert.equal(
    resolveLinkedOrganizationId({
      userOrgId: "user-org",
      userEmployerId: "employer-id",
      claimOrgId: "claim-org",
      claimEmployerId: "claim-employer",
    }),
    "user-org",
  );

  assert.equal(
    resolveLinkedOrganizationId({
      userEmployerId: "employer-id",
      claimOrgId: "claim-org",
      claimEmployerId: "claim-employer",
    }),
    "employer-id",
  );

  assert.equal(
    resolveLinkedOrganizationId({
      claimOrgId: "claim-org",
      claimEmployerId: "claim-employer",
    }),
    "claim-org",
  );
});

test("resolveLinkedOrganizationId ignores blank values and reports missing links accurately", () => {
  assert.equal(
    resolveLinkedOrganizationId({
      memberOrgId: "   ",
      userOrgId: "",
      userEmployerId: null,
      claimOrgId: undefined,
      claimEmployerId: "claim-employer",
    }),
    "claim-employer",
  );

  assert.equal(
    hasLinkedOrganization({
      memberOrgId: "",
      userOrgId: null,
      userEmployerId: undefined,
    }),
    false,
  );

  assert.equal(
    hasLinkedOrganization({
      userOrgId: "legacy-org",
    }),
    true,
  );
});
