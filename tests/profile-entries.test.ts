import test from "node:test";
import assert from "node:assert/strict";

import {
  addEntry,
  educationEntryLabel,
  formatWorkDate,
  formatWorkDateRange,
  removeEntry,
  updateEntry,
  workExperienceEntryLabel,
} from "../src/lib/profile-entries.ts";

interface WorkExperienceLike {
  title: string;
  employer: string;
  startDate: string;
  endDate: string;
  description: string;
}

const emptyWorkExperience: WorkExperienceLike = {
  title: "",
  employer: "",
  startDate: "",
  endDate: "",
  description: "",
};

// --- Education entry labels (Bug 6) ---

test("education label shows school and degree when both are present", () => {
  assert.equal(
    educationEntryLabel({ school: "QA Test University", degree: "QA Test Degree" }, 0),
    "QA Test University — QA Test Degree",
  );
});

test("education label falls back to whichever of school/degree is present", () => {
  assert.equal(educationEntryLabel({ school: "QA Test University", degree: " " }, 1), "QA Test University");
  assert.equal(educationEntryLabel({ school: "", degree: "QA Test Degree" }, 2), "QA Test Degree");
});

test("education label falls back to numbered label when fields are empty", () => {
  assert.equal(educationEntryLabel({ school: "", degree: "" }, 0), "Education 1");
  assert.equal(educationEntryLabel({ school: "  ", degree: " " }, 2), "Education 3");
  assert.equal(educationEntryLabel(null, 1), "Education 2");
});

// --- Work experience entry labels (mirrors education labeling) ---

test("work experience label shows title and employer when both are present", () => {
  assert.equal(
    workExperienceEntryLabel({ title: "Barista", employer: "North Battleford Café" }, 0),
    "Barista — North Battleford Café",
  );
});

test("work experience label falls back to whichever of title/employer is present", () => {
  assert.equal(workExperienceEntryLabel({ title: "Barista", employer: "" }, 0), "Barista");
  assert.equal(workExperienceEntryLabel({ title: "", employer: "North Battleford Café" }, 0), "North Battleford Café");
});

test("work experience label falls back to numbered label when fields are empty", () => {
  assert.equal(workExperienceEntryLabel({ title: "", employer: "" }, 0), "Work Experience 1");
  assert.equal(workExperienceEntryLabel(undefined, 1), "Work Experience 2");
});

// --- Work experience CRUD (Bug 5) ---

test("adding a work experience entry appends a fresh copy", () => {
  const entries = addEntry<WorkExperienceLike>([], emptyWorkExperience);

  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0], emptyWorkExperience);
  entries[0].title = "changed";
  assert.equal(emptyWorkExperience.title, "");
});

test("editing a work experience entry updates only that entry and field", () => {
  const entries: WorkExperienceLike[] = [
    { ...emptyWorkExperience, title: "Cashier", employer: "Co-op" },
    { ...emptyWorkExperience, title: "Barista", employer: "Café" },
  ];
  const updated = updateEntry(entries, 0, "title", "Senior Cashier");

  assert.equal(updated[0].title, "Senior Cashier");
  assert.equal(updated[0].employer, "Co-op");
  assert.equal(updated[1].title, "Barista");
  // Original list is not mutated.
  assert.equal(entries[0].title, "Cashier");
});

test("editing out of range leaves entries unchanged", () => {
  const entries: WorkExperienceLike[] = [{ ...emptyWorkExperience, title: "Cashier" }];
  const updated = updateEntry(entries, 5, "title", "Senior");

  assert.deepEqual(updated, entries);
});

test("deleting a work experience entry removes it by index", () => {
  const entries: WorkExperienceLike[] = [
    { ...emptyWorkExperience, title: "Cashier" },
    { ...emptyWorkExperience, title: "Barista" },
  ];
  const remaining = removeEntry(entries, 0);

  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].title, "Barista");
});

// --- Date formatting ---

test("formatWorkDate renders month values as Mon YYYY", () => {
  assert.equal(formatWorkDate("2022-06"), "Jun 2022");
  assert.equal(formatWorkDate("1999-12"), "Dec 1999");
});

test("formatWorkDate returns empty for blank or invalid values", () => {
  assert.equal(formatWorkDate(""), "");
  assert.equal(formatWorkDate(null), "");
  assert.equal(formatWorkDate("2022-13"), "");
  assert.equal(formatWorkDate("June 2022"), "");
});

test("formatWorkDateRange renders ranges and open-ended roles", () => {
  assert.equal(formatWorkDateRange("2022-06", "2023-09"), "Jun 2022 — Sep 2023");
  assert.equal(formatWorkDateRange("2022-06", ""), "Jun 2022 — Present");
  assert.equal(formatWorkDateRange("", "2023-09"), "Sep 2023");
  assert.equal(formatWorkDateRange("", ""), "");
});
