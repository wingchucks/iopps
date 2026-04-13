import test from "node:test";
import assert from "node:assert/strict";

import { buildAdminUserSoftDeleteUpdate } from "../src/app/api/admin/users/[userId]/route.ts";

test("buildAdminUserSoftDeleteUpdate writes audit metadata for soft deletes", () => {
  assert.deepEqual(
    buildAdminUserSoftDeleteUpdate("admin_1", "2026-04-13T00:00:00.000Z"),
    {
      status: "deleted",
      deletedAt: "2026-04-13T00:00:00.000Z",
      deletedBy: "admin_1",
      updatedAt: "2026-04-13T00:00:00.000Z",
    },
  );
});
