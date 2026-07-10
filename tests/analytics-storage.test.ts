import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAnalyticsDeltas,
  buildMetricDocumentId,
  mergeCounterMaps,
  topAnalyticsItems,
} from "../src/lib/analytics/storage.ts";

test("analytics deltas are fixed-cardinality and never include page or click maps", () => {
  const pageView = buildAnalyticsDeltas("page_view");
  const apply = buildAnalyticsDeltas("job_apply_click");

  assert.deepEqual(Object.keys(pageView).sort(), ["applyClicks", "clicks", "events", "outboundClicks", "pageViews"]);
  assert.equal(pageView.pageViews, 1);
  assert.equal(pageView.clicks, 0);
  assert.equal(apply.pageViews, 0);
  assert.equal(apply.clicks, 1);
  assert.equal(apply.applyClicks, 1);
  assert.equal("pages" in pageView, false);
});

test("metric IDs are deterministic, bounded, and cannot create nested Firestore paths", () => {
  const first = buildMetricDocumentId("page", "https://www.iopps.ca/jobs/a/b?x=1");
  const second = buildMetricDocumentId("page", "https://www.iopps.ca/jobs/a/b?x=1");

  assert.equal(first, second);
  assert.ok(first.startsWith("page_"));
  assert.equal(first.includes("/"), false);
  assert.ok(first.length <= 260);
});

test("legacy and v2 counter maps merge before selecting top items", () => {
  const merged = mergeCounterMaps({ jobs: 4, events: 1 }, { jobs: 3, training: 2 });
  assert.deepEqual(merged, { jobs: 7, events: 1, training: 2 });
  assert.deepEqual(topAnalyticsItems(merged, 2), [
    { label: "jobs", count: 7 },
    { label: "training", count: 2 },
  ]);
});
