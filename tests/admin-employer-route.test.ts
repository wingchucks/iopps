import test from "node:test";
import assert from "node:assert/strict";

import {
  buildOrganizationSoftDeleteMetadata,
  buildSoftDeleteContentPatch,
} from "../src/app/api/admin/employers/[orgId]/route.ts";

test("buildOrganizationSoftDeleteMetadata archives org visibility and audit state", () => {
  assert.deepEqual(
    buildOrganizationSoftDeleteMetadata("admin_1", "2026-04-13T00:00:00.000Z"),
    {
      disabled: true,
      status: "disabled",
      deletedAt: "2026-04-13T00:00:00.000Z",
      deletedBy: "admin_1",
      updatedAt: "2026-04-13T00:00:00.000Z",
      isPublished: false,
      publicationStatus: "SUSPENDED",
      publicVisibility: "hidden",
      directoryVisible: false,
      isDirectoryVisible: false,
    },
  );
});

test("buildSoftDeleteContentPatch hides linked public content by collection type", () => {
  assert.deepEqual(
    buildSoftDeleteContentPatch("jobs", "2026-04-13T00:00:00.000Z"),
    {
      active: false,
      status: "deleted",
      updatedAt: "2026-04-13T00:00:00.000Z",
    },
  );
  assert.deepEqual(
    buildSoftDeleteContentPatch("posts", "2026-04-13T00:00:00.000Z"),
    {
      status: "deleted",
      updatedAt: "2026-04-13T00:00:00.000Z",
    },
  );
  assert.equal(
    buildSoftDeleteContentPatch("subscriptions", "2026-04-13T00:00:00.000Z"),
    null,
  );
});
