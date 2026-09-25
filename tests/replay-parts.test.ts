import test from "node:test";
import assert from "node:assert/strict";
import { replayParts, videoDate, type LivestreamVideo } from "../src/lib/livestreams.ts";

const video = (id: string, title: string, actualStart: string): LivestreamVideo => ({ id, title, actualStart, description: "", thumbnail: "", publishedAt: actualStart, liveBroadcastContent: "none", embeddable: true });

test("replays that share a title are numbered by start time, others are left alone", () => {
  const title = "SATURDAY NIGHT LIVE- MOOSOMIN FIRST NATION POW WOW 2026";
  const parts = replayParts([
    video("late", title, "2026-09-13T05:10:53Z"),
    video("first", title, "2026-09-13T01:41:43Z"),
    video("second", `${title} `, "2026-09-13T01:49:42Z"),
    video("sunday", "CHAMPIONSHIP SUNDAY @ MOOSOMIN FIRST NATION", "2026-09-13T19:09:48Z"),
    video("sunday-live", "CHAMPIONSHIP SUNDAY LIVE @ MOOSOMIN FIRST NATION POW WOW 2026", "2026-09-13T18:37:53Z"),
    video("first", title, "2026-09-13T01:41:43Z"),
  ]);
  assert.deepEqual(parts.get("first"), { part: 1, of: 3 });
  assert.deepEqual(parts.get("second"), { part: 2, of: 3 });
  assert.deepEqual(parts.get("late"), { part: 3, of: 3 });
  assert.equal(parts.has("sunday"), false, "similar titles are not treated as the same broadcast");
  assert.equal(parts.has("sunday-live"), false);
});

test("replay dates include the start time in the prairie time zone", () => {
  assert.match(videoDate("2026-09-13T01:41:43Z", true), /Sep 12, 2026.*7:41/);
});
