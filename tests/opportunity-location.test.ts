import test from "node:test";
import assert from "node:assert/strict";
import { publicOpportunityRecord } from "../src/lib/server/public-opportunities.ts";

const base = { id: "fictional-event", title: "Fictional gathering", status: "active", startDate: "2099-10-09", endDate: "2099-10-11" };

test("event projection removes repeated full city/province labels and keeps venue", () => {
  const record = publicOpportunityRecord({ ...base, location: "Vancouver, BC", city: "Vancouver, BC", province: "BC", venue: "Convention Centre" }, "events");
  assert.equal(record?.location, "Vancouver, BC, Convention Centre");
  assert.equal(record?.startDate, base.startDate);
  assert.equal(record?.endDate, base.endDate);
  assert.equal(publicOpportunityRecord({ ...base, location: "Victoria, BC", city: "Victoria, BC", province: "bc" }, "events")?.location, "Victoria, BC");
});

test("event projection handles structured legacy location and online events", () => {
  assert.equal(publicOpportunityRecord({ ...base, location: { city: "Prince Albert", province: "SK", venue: "Art Hauser Centre" }, city: "Prince Albert, SK" }, "events")?.location, "Art Hauser Centre, Prince Albert, SK");
  assert.equal(publicOpportunityRecord({ ...base, location: "Vancouver, BC, Vancouver, BC", delivery: "online" }, "events")?.location, "Online");
});

test("location normalization preserves distinct places and publication boundaries", () => {
  assert.equal(publicOpportunityRecord({ ...base, location: "Victoria; Vancouver; BC" }, "events")?.location, "Victoria; Vancouver; BC");
  assert.equal(publicOpportunityRecord({ ...base, status: "draft", location: "Victoria, Victoria" }, "events"), null);
  assert.equal(publicOpportunityRecord({ ...base, active: false, location: "Victoria, Victoria" }, "events"), null);
});

test("original repeated names and multi-site separators remain intact", () => {
  assert.equal(publicOpportunityRecord({ ...base, location: "Québec, Québec", city: "Québec", province: "Québec" }, "events")?.location, "Québec, Québec");
  const location = "City Hall, Regina, SK; Community Centre, Saskatoon, SK";
  assert.equal(publicOpportunityRecord({ ...base, location, province: "SK" }, "events")?.location, location);
  assert.equal(publicOpportunityRecord({ ...base, location: "North Vancouver, BC", city: "Vancouver, BC" }, "events")?.location, "North Vancouver, BC, Vancouver, BC");
});
