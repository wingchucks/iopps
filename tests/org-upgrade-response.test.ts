import test from "node:test";
import assert from "node:assert/strict";
import {
  UPGRADE_FALLBACK_ERROR,
  getUpgradeErrorMessage,
  readUpgradeResponse,
} from "../src/lib/client/upgrade-response.ts";

test("reads JSON upgrade errors", async () => {
  const response = new Response(JSON.stringify({ error: "Security check failed" }), { status: 403 });

  const data = await readUpgradeResponse(response);

  assert.equal(getUpgradeErrorMessage(data), "Security check failed");
});

test("handles empty upgrade responses without throwing", async () => {
  const response = new Response("", { status: 500 });

  const data = await readUpgradeResponse(response);

  assert.equal(getUpgradeErrorMessage(data), UPGRADE_FALLBACK_ERROR);
});

test("uses short plain text upgrade errors", async () => {
  const response = new Response("Internal Server Error", { status: 500 });

  const data = await readUpgradeResponse(response);

  assert.equal(getUpgradeErrorMessage(data), "Internal Server Error");
});

test("does not show HTML error pages as form errors", async () => {
  const response = new Response("<html><body>Internal Server Error</body></html>", { status: 500 });

  const data = await readUpgradeResponse(response);

  assert.equal(getUpgradeErrorMessage(data), UPGRADE_FALLBACK_ERROR);
});
