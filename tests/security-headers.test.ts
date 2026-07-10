import test from "node:test";
import assert from "node:assert/strict";

import nextConfig from "../next.config.ts";

test("security headers include a report-only content security policy", async () => {
  assert.equal(typeof nextConfig.headers, "function");
  const groups = await nextConfig.headers!();
  const globalHeaders = groups.find((group) => group.source === "/(.*)")?.headers ?? [];
  const reportOnly = globalHeaders.find((header) => header.key === "Content-Security-Policy-Report-Only");
  const enforced = globalHeaders.find((header) => header.key === "Content-Security-Policy");

  assert.equal(enforced, undefined, "CSP must start in report-only mode");
  assert.ok(reportOnly?.value.includes("default-src 'self'"));
  assert.ok(reportOnly?.value.includes("frame-ancestors 'self'"));
  assert.ok(reportOnly?.value.includes("https://www.googletagmanager.com"));
  assert.ok(reportOnly?.value.includes("https://firebasestorage.googleapis.com"));
  assert.ok(reportOnly?.value.includes("https://www.youtube.com"));
});
