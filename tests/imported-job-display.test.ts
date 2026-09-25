import test from "node:test";
import assert from "node:assert/strict";
import { displayJobLocation, formatListedMoney, importedSalaryLabel, jobImportLabels, payPeriodMissing } from "../src/lib/job-import-labels.ts";
import { normalizeJobDiscoveryMetadata } from "../src/lib/job-metadata.ts";
import { displayAmount } from "../src/lib/utils.ts";

test("missing imported details point to the original posting in plain words", () => {
  const feed = { source: "feed", sourceMetadata: { salary: "not-imported", closingDate: "not-imported" } } as const;
  assert.deepEqual(jobImportLabels({ ...feed, externalUrl: "https://source.example/job" }), { pay: "Pay: see original posting", closing: "Closing date: see original posting", sourceHref: "https://source.example/job" });
  assert.deepEqual(jobImportLabels({ ...feed }), { pay: "Pay not listed", closing: "Closing date not listed", sourceHref: undefined });
  assert.deepEqual(jobImportLabels({ source: "employer", externalUrl: "https://source.example/job" }), { pay: undefined, closing: undefined, sourceHref: "https://source.example/job" });
});

test("amounts with cents keep both digits and nothing else changes", () => {
  assert.equal(formatListedMoney("$31.1–$38.87 / hour"), "$31.10–$38.87 / hour");
  assert.equal(formatListedMoney("$19.2–$24"), "$19.20–$24");
  assert.equal(formatListedMoney("$1,234.5 per week"), "$1,234.50 per week");
  for (const unchanged of ["$22.25 / hour", "$80,000–$112,500", "$1.5 million fund", "$2.5M", "See official posting", "Band 3.2 applies"]) assert.equal(formatListedMoney(unchanged), unchanged);
  assert.equal(importedSalaryLabel({ label: " $26.6–$33.25 " }), "$26.60–$33.25");
  assert.equal(displayAmount(31.1), "$31.10");
  assert.equal(displayAmount(1500), "$1,500");
  const enriched = normalizeJobDiscoveryMetadata({ description: "Salary: hourly $31.10 to $38.87 depending on experience" });
  assert.equal(enriched.salary, "$31.10–$38.87 / hour");
  assert.equal(normalizeJobDiscoveryMetadata({ description: "Salary range: $80000 - $95000." }).salary, "$80,000–$95,000", "no period is invented");
});

test("a pay period is reported missing only when an amount states none", () => {
  assert.equal(payPeriodMissing("$23–$27.75"), true);
  assert.equal(payPeriodMissing("$43,000–$53,000"), true);
  for (const stated of ["$23–$27.75 / hour", "$60,000 per year", "$2,000 biweekly", "$300 a day", "See official posting", "Based on education and experience"]) assert.equal(payPeriodMissing(stated), false, stated);
});

test("job locations use one consistent form without adding anything", () => {
  const cases: Array<[unknown, string]> = [
    ["Saskatoon, SK, CA", "Saskatoon, SK"],
    ["Saskatoon, SK, Canada", "Saskatoon, SK"],
    ["Kinistin Saulteaux Nation, Saskatchewan", "Kinistin Saulteaux Nation, SK"],
    ["STC Head Office, Saskatoon, SK, CA", "STC Head Office, Saskatoon, SK"],
    ["Pickering, ON, CA; Pickering, ON, CA", "Pickering, ON"],
    ["ON, CA; Mississauga, ON, CA", "Mississauga, ON"],
    ["Sudbury, ON, CA; Sault Ste. Marie, ON, CA", "Sudbury, ON; Sault Ste. Marie, ON"],
    ["ON, CA", "Ontario"],
    ["Canada", "Canada"],
    ["Akwesasne (Ontario/Quebec)", "Akwesasne (Ontario/Quebec)"],
    ["Ottawa, Ontario (hybrid or local)", "Ottawa, Ontario (hybrid or local)"],
    ["Masset, Haida Gwaii, Haida Territory", "Masset, Haida Gwaii, Haida Territory"],
    [{ city: "Regina", province: "SK", remote: true }, "Remote, Regina, SK"],
    [undefined, ""],
  ];
  for (const [value, expected] of cases) assert.equal(displayJobLocation(value), expected, JSON.stringify(value));
});
