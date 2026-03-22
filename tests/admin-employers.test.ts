import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAdminEmployerRow } from "../src/lib/admin/employers.ts";

test("normalizes admin employer rows when only name exists", () => {
  const employer = normalizeAdminEmployerRow({
    id: "org_1",
    name: "Northern Sky Logistics",
    status: "pending",
  });

  assert.equal(employer.displayName, "Northern Sky Logistics");
  assert.equal(employer.organizationName, "Northern Sky Logistics");
  assert.equal(employer.status, "pending");
});

test("normalizes admin employer rows when only organizationName exists", () => {
  const employer = normalizeAdminEmployerRow({
    id: "org_2",
    organizationName: "Red Willow Consulting",
    status: "approved",
  });

  assert.equal(employer.displayName, "Red Willow Consulting");
  assert.equal(employer.status, "approved");
});

test("falls back from companyName to slug to id in the expected order", () => {
  const companyNameEmployer = normalizeAdminEmployerRow({
    id: "org_3",
    companyName: "Prairie Trades Group",
  });
  const slugEmployer = normalizeAdminEmployerRow({
    id: "org_4",
    slug: "prairie-trades-group",
  });
  const idEmployer = normalizeAdminEmployerRow({
    id: "org_5",
  });

  assert.equal(companyNameEmployer.displayName, "Prairie Trades Group");
  assert.equal(slugEmployer.displayName, "prairie-trades-group");
  assert.equal(idEmployer.displayName, "org_5");
});

test("marks school records with a school account type", () => {
  const employer = normalizeAdminEmployerRow({
    id: "school_1",
    name: "Example School",
    type: "school",
  });

  assert.equal(employer.accountType, "school");
  assert.equal(employer.publicHref, "/schools/school_1");
});
