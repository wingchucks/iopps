import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEventJsonLd,
  buildJobPostingJsonLd,
  buildListingMetadata,
  buildTrainingCourseJsonLd,
} from "../src/lib/server/seo.ts";

test("buildListingMetadata creates canonical and social tags for listing pages", () => {
  const metadata = buildListingMetadata({
    title: "Mental Health and Wellness Clinician",
    description: "Apply for this FNHA role on IOPPS.ca.",
    path: "/jobs/mental-health-and-wellness-clinician",
    type: "article",
  });

  assert.deepEqual(metadata.title, { absolute: "Mental Health and Wellness Clinician | IOPPS.ca" });
  assert.equal(metadata.alternates?.canonical, "https://www.iopps.ca/jobs/mental-health-and-wellness-clinician");
  assert.equal(metadata.openGraph?.title, "Mental Health and Wellness Clinician | IOPPS.ca");
  assert.equal(metadata.openGraph?.url, "https://www.iopps.ca/jobs/mental-health-and-wellness-clinician");
  assert.equal(metadata.twitter?.card, "summary_large_image");
});

test("buildJobPostingJsonLd emits Google JobPosting schema with IOPPS canonical URL", () => {
  const jsonLd = buildJobPostingJsonLd({
    slug: "mental-health-and-wellness-clinician",
    title: "Mental Health and Wellness Clinician",
    description: "Support wellness services in Mount Currie.",
    employerName: "First Nations Health Authority",
    location: "Mount Currie / Vancouver Coastal Region, BC",
    datePosted: "2026-06-28",
    closingDate: "2026-07-04",
    employmentType: "Full-time",
    salary: "See official posting",
  });

  assert.equal(jsonLd["@context"], "https://schema.org");
  assert.equal(jsonLd["@type"], "JobPosting");
  assert.equal(jsonLd.title, "Mental Health and Wellness Clinician");
  assert.equal(jsonLd.hiringOrganization.name, "First Nations Health Authority");
  assert.equal(jsonLd.url, "https://www.iopps.ca/jobs/mental-health-and-wellness-clinician");
  assert.equal(jsonLd.validThrough, "2026-07-04");
  assert.equal(jsonLd.jobLocation.address.addressRegion, "BC");
});

test("buildEventJsonLd emits Event schema for pow wow listings", () => {
  const jsonLd = buildEventJsonLd({
    slug: "mosquito-grizzly-bears-head-annual-pow-wow",
    title: "Mosquito Grizzly Bears Head Annual Pow Wow",
    description: "Annual traditional pow wow near Battleford.",
    startDate: "2026-07-03",
    endDate: "2026-07-05",
    location: "30 km south of Battleford, SK",
    venue: "Mosquito-Grizzly Bears Head-Lean Man First Nation",
    organizer: "Mosquito-Grizzly Bears Head-Lean Man First Nation",
  });

  assert.equal(jsonLd["@type"], "Event");
  assert.equal(jsonLd.url, "https://www.iopps.ca/events/mosquito-grizzly-bears-head-annual-pow-wow");
  assert.equal(jsonLd.location.name, "Mosquito-Grizzly Bears Head-Lean Man First Nation");
  assert.equal(jsonLd.location.address.addressRegion, "SK");
  assert.equal(jsonLd.eventAttendanceMode, "https://schema.org/OfflineEventAttendanceMode");
});

test("buildTrainingCourseJsonLd emits Course schema with IOPPS training URL", () => {
  const jsonLd = buildTrainingCourseJsonLd({
    slug: "fnuniv-icec-professional-microcredentials",
    title: "FNUniv ICEC Professional MicroBadges, Microcredentials, and MicroCertificates",
    description: "Professional learning through First Nations University of Canada.",
    provider: "First Nations University of Canada",
    location: "Online / First Nations University of Canada",
  });

  assert.equal(jsonLd["@type"], "Course");
  assert.equal(jsonLd.url, "https://www.iopps.ca/training/fnuniv-icec-professional-microcredentials");
  assert.equal(jsonLd.provider.name, "First Nations University of Canada");
});
