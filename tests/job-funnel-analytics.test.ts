import test from "node:test";
import assert from "node:assert/strict";

async function loadTracker() {
  const helper = await import("../src/lib/job-funnel-analytics.ts").catch(() => null);
  assert.ok(helper, "job funnel analytics helper must exist");
  return helper.trackJobFunnelEvent;
}

test("tracking is optional on server, absent/nonfunction gtag, or a throwing tracker", async () => {
  const track = await loadTracker();
  Reflect.deleteProperty(globalThis, "window");
  assert.doesNotThrow(() => track("job_detail_view", { jobId: "job-1" }));
  for (const gtag of [undefined, true, () => { throw new Error("blocked"); }]) {
    Object.defineProperty(globalThis, "window", { configurable: true, value: { gtag } });
    assert.doesNotThrow(() => track("job_detail_view", { jobId: "job-1" }));
  }
});

test("runtime allowlist rejects unknown events and invalid values", async () => {
  const track = await loadTracker();
  const { calls } = browser();
  track("private-query" as Parameters<typeof track>[0], { jobId: "job-1" });
  for (const jobId of [undefined, "a@example.com", "https://external.test/job", "private text", "x".repeat(129)]) {
    track("job_detail_view", { jobId });
  }
  for (const resultCount of [-1, 1.5, NaN, Infinity]) track("job_search_results", { resultCount });
  assert.equal(calls.length, 0);
  track("external_application_click", { jobId: "job-1", resultCount: 99 });
  assert.deepEqual(calls, [["event", "external_application_click", {
    job_id: "job-1", page_location: "https://www.iopps.ca/jobs", page_title: "Jobs", page_referrer: "",
  }]]);
});

test("dedupes funnel milestones per job and session, bounded to 200 keys, never dedupes clicks", async () => {
  const track = await loadTracker();
  const { calls, fake, values } = browser();
  for (const event of ["job_detail_view", "application_start", "application_submitted"] as const) {
    track(event, { jobId: "job-1" });
    track(event, { jobId: "job-1" });
    track(event, { jobId: "job-2" });
  }
  assert.equal(calls.length, 6);
  for (let i = 0; i < 2; i++) track("external_application_click", { jobId: "job-1" });
  assert.equal(calls.length, 8);
  // A new window object using the same tab storage models a document reload.
  Object.defineProperty(globalThis, "window", { configurable: true, value: { ...fake } });
  track("application_submitted", { jobId: "job-1" });
  assert.equal(calls.length, 8);
  for (let i = 0; i < 220; i++) track("job_detail_view", { jobId: `job-${i}` });
  assert.equal(values.size, 1);
  assert.equal(JSON.parse([...values.values()][0]).length, 200);
  const newSession = browser();
  track("application_submitted", { jobId: "job-1" });
  assert.equal(newSession.calls.length, 1);
});

test("blocked storage falls back to document dedupe without marking failed emissions", async () => {
  const track = await loadTracker();
  const { calls, fake } = browser();
  Object.defineProperty(fake, "sessionStorage", { get() { throw new Error("blocked"); } });
  const emit = fake.gtag;
  fake.gtag = () => { throw new Error("unavailable"); };
  track("application_submitted", { jobId: "job-1" });
  fake.gtag = emit;
  track("application_submitted", { jobId: "job-1" });
  track("application_submitted", { jobId: "job-1" });
  assert.equal(calls.length, 1);
});

test("write-only storage failure still dedupes in memory", async () => {
  const track = await loadTracker();
  const { calls, fake } = browser();
  fake.sessionStorage.setItem = () => { throw new Error("quota"); };
  track("job_detail_view", { jobId: "job-1" });
  track("job_detail_view", { jobId: "job-1" });
  assert.equal(calls.length, 1);
});

test("late GA readiness replays sanitized early milestones once", async () => {
 const helper = await import("../src/lib/job-funnel-analytics.ts");
 const {calls,fake}=browser();const emit=fake.gtag;Reflect.deleteProperty(fake,'gtag');
 helper.trackJobFunnelEvent('job_detail_view',{jobId:'early',email:'private@example.test'} as Parameters<typeof helper.trackJobFunnelEvent>[1]);
 helper.trackJobFunnelEvent('job_detail_view',{jobId:'early'});
 assert.equal(typeof helper.flushJobFunnelEvents,'function');
 fake.gtag=emit;helper.flushJobFunnelEvents();helper.flushJobFunnelEvents();
 assert.equal(calls.length,1);assert.doesNotMatch(JSON.stringify(calls),/private/);
});
function browser() {
  const calls: unknown[][] = [];
  const values = new Map<string, string>();
  const fake = {
    gtag: (...args: unknown[]) => { calls.push(args); },
    sessionStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: fake });
  return { calls, fake, values };
}

test("emits allowlisted search counts without caller text or inherited page context", async () => {
  const track = await loadTracker();
  const { calls } = browser();
  track("job_search_results", {
    resultCount: 0, query: "private search", email: "private@example.com",
    resume: "private resume", userId: "private-user", url: "https://external.test/private",
  } as Parameters<typeof track>[1]);
  assert.deepEqual(calls, [["event", "job_search_results", {
    result_count: 0,
    page_location: "https://www.iopps.ca/jobs",
    page_title: "Jobs",
    page_referrer: "",
  }]]);
});
