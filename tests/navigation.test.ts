import test from "node:test";
import assert from "node:assert/strict";

import {
  getAppExploreNavItems,
  getBrandHref,
  getMemberUtilityNavItems,
  getPublicAuthNavItems,
} from "../src/lib/navigation.ts";

test("public explore nav includes jobs and excludes private member utilities", () => {
  const publicItems = getAppExploreNavItems({ isAuthenticated: false });
  const keys = publicItems.map((item) => item.key);

  assert.equal(publicItems[0]?.href, "/");
  assert(keys.includes("jobs"));
  assert(keys.includes("events"));
  assert(keys.includes("schools"));
  assert(keys.includes("businesses"));
  assert(keys.includes("search"));
  assert(!keys.includes("saved"));
  assert(!keys.includes("notifications"));
  assert(!keys.includes("settings"));
  assert(!keys.includes("dashboard"));
  assert(!keys.includes("admin"));
});

test("member explore nav includes jobs/events and appends org/admin links when allowed", () => {
  const memberItems = getAppExploreNavItems({
    isAuthenticated: true,
    hasOrg: true,
    isAdmin: true,
  });
  const keys = memberItems.map((item) => item.key);

  assert.equal(memberItems[0]?.href, "/feed");
  assert(keys.includes("jobs"));
  assert(keys.includes("events"));
  assert(keys.includes("dashboard"));
  assert(keys.includes("admin"));
});

test("brand and auth links use public-friendly destinations", () => {
  const authItems = getPublicAuthNavItems();
  const utilityItems = getMemberUtilityNavItems();

  assert.deepEqual(
    authItems.map((item) => item.href),
    ["/login", "/signup"],
  );
  assert.deepEqual(
    utilityItems.map((item) => item.key),
    ["saved", "notifications", "settings"],
  );
  assert.equal(getBrandHref(false), "/");
  assert.equal(getBrandHref(true), "/feed");
});
