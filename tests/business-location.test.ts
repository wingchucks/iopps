import test from "node:test";
import assert from "node:assert/strict";
import { businessListingIssues, businessLocationIssue, businessLocationWarning } from "../src/lib/business-listing-review.ts";
import { countryNamed } from "../src/lib/country-names.ts";

const complete = { name: "Fictional organization", logoUrl: "https://example.invalid/logo.png", description: "Fictional services.", website: "https://example.invalid" };

test("directory locations need a Canadian province or territory and a real place name", () => {
  for (const location of [
    { city: "Saskatoon", province: "SK" },
    { city: "Onion Lake", province: "Saskatchewan" },
    { city: "Whitefish Lake First Nation #128 / Edmonton", province: "AB" },
    { city: "Kahnawà:ke", province: "Quebec" },
    { city: "Skwxwú7mesh", province: "BC" },
    { city: "L'Anse-au-Loup", province: "NL" },
    { city: "St. Albert", province: "AB", country: "Canada" },
    "Regina, Saskatchewan",
  ]) assert.equal(businessLocationIssue(location), null, JSON.stringify(location));

  const cases: Array<[unknown, RegExp]> = [
    [undefined, /Add your city and a Canadian province/],
    [{ city: "", province: "" }, /Add your city and a Canadian province/],
    [{ city: "Dubai", province: "", country: "United Arab Emirates" }, /based in Canada/],
    [{ city: "Seattle", province: "Washington" }, /Choose a Canadian province/],
    [{ city: "", province: "SK" }, /Add the city, town or community/],
    [{ city: "https://thestudenthelpers.com/", province: "ON" }, /Enter the name of your Canadian city/],
    [{ city: "shop.example.com", province: "ON" }, /Enter the name of your Canadian city/],
    [{ city: "hello@example.invalid", province: "ON" }, /Enter the name of your Canadian city/],
    [{ city: "12345", province: "ON" }, /Enter the name of your Canadian city/],
    [{ city: "Yukon", province: "Yukon" }, /not only the province/],
    [{ city: "Canada", province: "MB" }, /not only the province/],
  ];
  for (const [location, message] of cases) assert.match(String(businessLocationIssue(location)), message, JSON.stringify(location));
  assert.ok(businessListingIssues({ ...complete, location: { city: "Yukon", province: "Yukon" } }).some(issue => /not only the province/.test(issue)));
  assert.deepEqual(businessListingIssues({ ...complete, location: { city: "Whitehorse", province: "YT" } }), []);
});

test("a city named like a country is flagged for a person, never blocked", () => {
  const reported = { city: "uae", province: "Yukon" };
  assert.equal(businessLocationIssue(reported), null, "the listing can still be submitted and reviewed");
  assert.match(String(businessLocationWarning(reported)), /"uae" matches a country name \(UAE\)/);
  assert.match(String(businessLocationWarning({ city: "Dubai, U.A.E.", province: "ON" })), /UAE/);
  assert.match(String(businessLocationWarning({ city: "Togo", province: "SK" })), /Togo/, "a real Saskatchewan village is only flagged");
  assert.equal(businessLocationWarning({ city: "Saskatoon", province: "SK" }), null);
  assert.equal(businessLocationWarning({ city: "Norway House", province: "MB" }), null, "whole names only");
  assert.equal(countryNamed("U.S.A."), "USA");
  assert.equal(countryNamed("Côte d’Ivoire"), "Cote d'Ivoire");
  assert.equal(countryNamed(42), null);
});
