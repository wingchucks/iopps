import test from "node:test";

// Execute the real TSX with real React/Chrome, not source-text assertions.
// The helper keeps the browser fixture JavaScript separate from product types.
test("opportunity directory request lifecycle", { timeout: 120000 }, async t => {
  const helper = "./helpers/opportunity-directory-browser.mjs";
  const { verifyDirectoryLifecycle } = await import(helper);
  await verifyDirectoryLifecycle(t);
});
