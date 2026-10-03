/* eslint-disable @typescript-eslint/no-explicit-any -- Narrow VM route doubles verify reporting contracts without customer data. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as reporting from "../src/lib/admin/reporting.ts";
import * as pricing from "../src/lib/pricing.ts";
import * as partnerSubscription from "../src/lib/server/partner-subscription.ts";

const now = Date.parse("2026-10-01T12:00:00Z");
class ReportDate extends Date { constructor(value: any = now) {super(value);} }
function load(route: string, collections: Record<string, Record<string, unknown>[]>, options: {fail?: string; authorized?: boolean} = {}) {
  const reads: string[] = [];
  const documentReadSizes: number[] = [];
  const adminDb = {collection: (name: string) => {
    let limit = Infinity;
    let after: string | null = null;
    const filters: Array<[string, string, unknown]> = [];
    const rows = () => (collections[name] || []).filter(record => filters.every(([field, op, value]) => op === "==" ? record[field] === value : true));
    const query = {
      where: (field: string, op: string, value: unknown) => {filters.push([field, op, value]); return query;}, orderBy: () => query,
      startAfter: (id: string) => {after = id; return query;},
      count: () => ({get: async () => ({data: () => ({count: rows().length})})}),
      limit: (value: number) => {limit = value; return query;},
      get: async () => {
        reads.push(name);
        if (name === options.fail) throw Error("Fictional read failure");
        const docs = rows().map((record, index) => ({id: String(record.id ?? index), data: () => record})).sort((a,b) => a.id.localeCompare(b.id)).filter(doc => !after || doc.id > after).slice(0, limit);
        documentReadSizes.push(docs.length);
        return {docs, size: docs.length};
      },
    };
    return query;
  }};
  const exports: any = {};
  const mocks: Record<string, unknown> = {
    "next/server": {NextResponse: {json: Response.json}},
    "@/lib/api-auth": {verifyAdminToken: async () => options.authorized === false ? {success: false, response: Response.json({error: "Unauthorized"}, {status: 401})} : {success: true}},
    "@/lib/firebase-admin": {adminDb},
    "@/lib/admin/reporting": reporting,
    "@/lib/pricing": pricing,
    "@/lib/server/partner-subscription": partnerSubscription,
    "@/lib/public-job-merge": {isPublicJobRecordVisible: (record: Record<string, unknown>) => record.active === true},
    "@/lib/server/admin-job-lifecycle": {},
    // The admin jobs route refreshes public caches after its writes; reporting reads never do.
    "@/lib/employer-job-cache": {refreshPublicJobs: () => { throw Error("A reporting read refreshed the public job caches"); }},
    "firebase-admin/firestore": {FieldPath: {documentId: () => "__name__"}},
  };
  const code = ts.transpileModule(readFileSync(route, "utf8"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code, {exports, console: {error: () => {}}, Date: ReportDate, require: (name: string) => {assert.ok(name in mocks, name); return mocks[name];}});
  return {reads, documentReadSizes, get: (query = "") => exports.GET({nextUrl: new URL(`https://example.invalid/api/admin?${query}`)})};
}

test("plan assignments, trials and Stripe IDs are not revenue or growth", async () => {
  const route = load("src/app/api/admin/payments/route.ts", {
    employers: [
      {id: "a", name: "Same organization", plan: "premium", subscriptionStatus: "active"},
      {id: "b", name: "Same organization", plan: "premium", subscriptionStatus: "trialing"},
      {id: "c", plan: "standard", subscriptionStatus: "active", stripeSubscriptionId: "sub_fictional"},
      {id: "d", plan: "school", subscriptionStatus: "unknown"},
    ],
    subscriptions: [
      {id: "r1", orgId: "c", plan: "standard-post", billingCycle: "one-time", status: "active"},
      {id: "r2", orgId: "c", plan: "featured-post", billingCycle: "one-time", status: "refunded", totalAmount: 0},
    ],
    schoolProgramPayments: [{}],
  });
  const data = await (await route.get()).json();
  assert.equal(data.summary.totalRevenue, null);
  assert.equal(data.summary.monthlyRevenue, null);
  assert.equal(data.summary.growthPercent, null);
  assert.equal(data.summary.activePlanRecords, 2);
  assert.equal(data.summary.trialPlanRecords, 1);
  assert.equal(data.summary.linkedPlanRecords, 1);
  assert.equal(data.active.length, 3, "do not silently deduplicate or mutate plan records");
  const byId = Object.fromEntries(data.oneTime.map((row: any) => [row.id, row]));
  assert.equal(byId.r1.amount, null);
  assert.equal(byId.r1.title, "Standard Job Post");
  assert.equal(byId.r2.amount, 0, "a recorded zero is distinct from missing data");
  assert.equal(byId.r2.status, "refunded");
  assert.equal(data.schoolProgram[0].amount, null, "never invent a $50 receipt");
  assert.equal(data.scope.oneTimeReceiptLimit, 1000);
});

test("payments report reads the real term fields, lists one-time Stripe receipts and skips free accounts", async () => {
  const route = load("src/app/api/admin/payments/route.ts", {
    employers: [
      {id: "paid", name: "Paid org", plan: "premium", subscriptionStatus: "active", subscriptionStart: {seconds: Date.parse("2026-03-01T00:00:00Z") / 1000}, subscriptionEnd: "2027-03-01T00:00:00.000Z"},
      {id: "grant", name: "Granted org", plan: "premium", subscriptionStatus: "active", subscription: {tier: "premium", paymentId: "admin-grant-tier2", amountPaid: 0}},
      {id: "free", name: "Free signup", plan: "free", subscriptionTier: "free"},
      {id: "lapsed", name: "Lapsed org", plan: "free", subscriptionTier: "free", subscriptionStatus: "expired", subscriptionEnd: "2026-01-01T00:00:00.000Z", subscription: {tier: "free", status: "expired"}},
    ],
    subscriptions: [
      {id: "cs_1", orgId: "paid", plan: "featured-post", billingCycle: "one-time", status: "active", totalAmount: 210, createdAt: "2026-09-01T00:00:00.000Z"},
      {id: "cs_old", orgId: "lapsed", employerId: "lapsed", plan: "tier1", billingCycle: "annual", status: "expired", amount: 1250, expiresAt: "2026-01-01T00:00:00.000Z"},
    ],
  });
  const data = await (await route.get()).json();
  const paid = data.active.find((row: any) => row.id === "paid");
  assert.equal(paid.subscriptionStartDate, "2026-03-01T00:00:00.000Z");
  assert.equal(paid.subscriptionEndDate, "2027-03-01T00:00:00.000Z");
  assert.equal(data.active.find((row: any) => row.id === "grant").complimentary, true);
  assert.equal(data.summary.complimentaryPlanRecords, 1);
  assert.deepEqual(data.expired.map((row: any) => [row.id, row.plan]), [["lapsed", "standard"]], "free signups are not plan records; lapsed customers keep their last plan");
  assert.equal(data.summary.otherPlanRecords, 1);
  assert.deepEqual(data.oneTime.map((row: any) => [row.id, row.employer, row.amount, row.title]), [["cs_1", "Paid org", 210, "Featured Job Post"]]);
});

test("failed school metadata read is unavailable, not zero payments", async () => {
  const route = load("src/app/api/admin/payments/route.ts", {}, {fail: "schoolProgramPayments"});
  const data = await (await route.get()).json();
  assert.equal(data.summary.schoolProgramPaymentRecords, null);
  assert.equal(data.scope.schoolProgramAvailable, false);
});

test("jobs use bounded cursor pages and explicit aggregate stored counts", async () => {
  const jobs = Array.from({length: 115}, (_, i) => ({id: `job${String(i).padStart(3, "0")}`, active: i % 2 === 0, createdAt: new Date(now - i * 1000).toISOString()}));
  const route = load("src/app/api/admin/jobs/route.ts", {jobs: [...jobs, {id: "undated", active: false}, {id: "removed", active: true, status: "deleted"}, {id: "removed2", active: false, deletedAt: "fictional"}]});
  const first = await (await route.get("limit=20")).json();
  const second = await (await route.get(`limit=20&cursor=${first.nextCursor}`)).json();
  assert.equal(first.total, 118, "aggregate counts include retained deleted records and are labeled accordingly");
  assert.match(first.scope, /including retained soft-deleted/);
  assert.equal(first.jobs.length, 20);
  assert.equal(second.jobs.length, 20);
  assert.equal(new Set([...first.jobs, ...second.jobs].map(row => row.id)).size, 40);
  const seen = new Set<string>();
  let cursor: string | null = null;
  do {
    const data = await (await route.get(`limit=20${cursor ? `&cursor=${cursor}` : ""}`)).json();
    for (const row of data.jobs) {assert.ok(!seen.has(row.id)); seen.add(row.id);}
    cursor = data.nextCursor;
  } while (cursor);
  assert.equal(seen.size, 116);
  assert.ok(seen.has("undated"));
  assert.ok(!seen.has("removed") && !seen.has("removed2"));
  assert.ok(route.documentReadSizes.every(size => size <= 21), "at most one bounded page plus lookahead is read");
  const unknown = await (await load("src/app/api/admin/jobs/route.ts", {jobs: [{id: "legacy", status: "active"}]}).get()).json();
  assert.equal(unknown.jobs[0].status, "unknown");
  const active = await (await route.get("status=active&limit=100")).json();
  assert.equal(active.total, 59);
  assert.equal(active.jobs.length, 58);
  assert.ok(active.jobs.every(row => row.active === true && row.status === "active"));
  const inactive = await (await route.get("status=inactive&limit=100")).json();
  assert.equal(inactive.total, 59);
  for (const query of ["page=0", "page=2", "limit=101", "limit=no", "status=draft", "cursor=a/b"]) assert.equal((await route.get(query)).status, 400);
});

test("empty or deleted-only cursor pages retain correct navigation", async () => {
  const empty = await (await load("src/app/api/admin/jobs/route.ts", {}).get()).json();
  assert.equal(empty.total, 0);
  assert.equal(empty.nextCursor, null);
  const route = load("src/app/api/admin/jobs/route.ts", {jobs: [{id: "a", status: "deleted"}, {id: "b", active: true}]});
  const first = await (await route.get("limit=1")).json();
  assert.equal(first.jobs.length, 0);
  assert.equal(first.nextCursor, "a", "a hidden row must not strand later visible records");
  const second = await (await route.get("limit=1&cursor=a")).json();
  assert.equal(second.jobs[0].id, "b");
  assert.equal(second.nextCursor, null);
});

test("reports include native and serialized timestamps consistently without inventing legacy dates", async () => {
  const recent = now - 86400000;
  const route = load("src/app/api/admin/reports/route.ts", {
    users: [{createdAt: new Date(recent).toISOString()}, {createdAt: {toDate: () => new Date(recent)}, role: "employer", status: "active"}, {createdAt: {_seconds: recent / 1000}}, {createdAt: "invalid"}, {}, {createdAt: new Date(now + 86400000).toISOString()}],
    jobs: [{createdAt: {seconds: recent / 1000}}, {createdAt: new Date(now - 100 * 86400000).toISOString()}, {}],
    applications: [{appliedAt: {seconds: recent / 1000}}, {}],
    savedJobs: [],
  });
  const data = await (await route.get("range=90")).json();
  assert.equal(data.totalUsers, 3);
  assert.equal(data.totalJobs, 1);
  assert.equal(data.applicationsCount, 1);
  assert.equal(data.activeEmployers, 1);
  assert.equal(data.scope.undatedUsers, 2);
  assert.equal(data.scope.undatedJobs, 1);
  assert.equal(data.scope.undatedApplications, 1);
  assert.equal(data.scope.chartMonths, 6);
  assert.equal(data.userGrowth.reduce((sum, row) => sum + row.count, 0), 3);
  assert.equal(data.employerGrowth.reduce((sum, row) => sum + row.count, 0), 1);
  assert.equal(data.revenue.subscriptionRevenue, null);
  assert.equal(data.revenue.oneTimePayments, null);
  assert.ok(!route.reads.includes("subscriptions") && !route.reads.includes("payments"));
  const all = await (await route.get("range=all")).json();
  assert.equal(all.totalUsers, 6);
  assert.equal(all.applicationsCount, 2);
  assert.equal((await route.get("range=invalid")).status, 400);
});

test("failed application reads do not claim zero applications", async () => {
  const data = await (await load("src/app/api/admin/reports/route.ts", {}, {fail: "applications"}).get()).json();
  assert.equal(data.applicationsCount, null);
  assert.equal(data.scope.undatedApplications, null);
});

test("reporting endpoints retain admin authorization before reading data", async () => {
  for (const path of ["payments", "jobs", "reports"]) {
    const route = load(`src/app/api/admin/${path}/route.ts`, {}, {authorized: false});
    assert.equal((await route.get()).status, 401);
    assert.equal(route.reads.length, 0);
  }
});

test("date normalization rejects invalid and missing values; monetary fields are numeric only", () => {
  for (const value of [null, undefined, {}, "invalid", {seconds: NaN}, {toDate: () => {throw Error("invalid");}}]) assert.equal(reporting.reportingTimestamp(value), null);
  assert.equal(reporting.reportingTimestamp({seconds: now / 1000}), now);
  assert.equal(reporting.recordedAmount(0), 0);
  for (const value of [undefined, null, "50", -1, NaN, Infinity]) assert.equal(reporting.recordedAmount(value), null);
});


test("applications use canonical submission dates without guessing creation-date fallbacks", async () => {
  const day = 86400000;
  const route = load("src/app/api/admin/reports/route.ts", {applications: [
    {appliedAt: {toDate: () => new Date(now - day)}, createdAt: "invalid"},
    {appliedAt: {seconds: (now - 10 * day) / 1000}},
    {appliedAt: {_seconds: (now - 45 * day) / 1000}},
    {appliedAt: new Date(now - 100 * day).toISOString()},
    {appliedAt: "invalid", createdAt: new Date(now - day).toISOString()},
    {createdAt: new Date(now - day).toISOString()},
    {appliedAt: null},
    {appliedAt: new Date(now + day).toISOString()},
    {appliedAt: {toDate: () => {throw Error("invalid timestamp");}}},
    {appliedAt: {seconds: (now - 7 * day) / 1000}},
    {appliedAt: now},
  ]});
  for (const [range, expected] of [["7", 3], ["30", 4], ["90", 5], ["all", 11]] as const) {
    const data = await (await route.get(`range=${range}`)).json();
    assert.equal(data.applicationsCount, expected, range);
    assert.equal(data.scope.undatedApplications, 4);
  }
});
