import test from "node:test";
import assert from "node:assert/strict";
import { loadYouTubeFeed, DISCOVERY_CACHE_SECONDS, VIDEO_CACHE_SECONDS, type SharedVideoLookup } from "../src/lib/youtube-feed.ts";
import { videoExcerpt } from "../src/lib/livestreams.ts";

const channelId = "UCtestChannel";
const ids = { live: "LiveVideo01", old: "OldVideo001", next: "NextVideo01", other: "OtherVideo1" };
function resource(id: string, state = "none", extra: Record<string, unknown> = {}) {
  return { id, snippet: { channelId, title: `Video ${id}`, description: "MOOSOMIN FIRST NATION", publishedAt: "2026-09-14T12:00:00Z", liveBroadcastContent: state }, status: { embeddable: true, privacyStatus: "public" }, ...extra };
}
function setup({ live = [], upcoming = [], recent = [], videos = [], failures = [] }: {
  live?: string[]; upcoming?: string[]; recent?: string[]; videos?: ReturnType<typeof resource>[]; failures?: string[];
} = {}) {
  const calls: { endpoint: string; ids: string[]; revalidate?: number }[] = [];
  const request = async (input: string, init: RequestInit & { next?: { revalidate: number } }) => {
    const url = new URL(input);
    const path = url.pathname.split("/").pop()!;
    const endpoint = path === "search" ? url.searchParams.get("eventType")! : path;
    const requestedIds = url.searchParams.get("id")?.split(",") ?? [];
    calls.push({ endpoint, ids: requestedIds, revalidate: init.next?.revalidate });
    assert.ok(init.signal, "upstream requests have a bounded timeout");
    if (failures.includes(endpoint)) return new Response("Quota exceeded", { status: 403 });
    const items = endpoint === "live" ? live.map(videoId => ({ id: { videoId } })) : endpoint === "upcoming" ? upcoming.map(videoId => ({ id: { videoId } })) : endpoint === "playlistItems" ? recent.map(videoId => ({ contentDetails: { videoId } })) : videos.filter(video => requestedIds.includes(video.id));
    return Response.json({ items });
  };
  return { calls, load: (options: { manualIds?: string[]; requestedId?: string; lookupSharedVideo?: SharedVideoLookup } = {}) => loadYouTubeFeed({ apiKey: "test-key", channelId, request, lookupSharedVideo: async (_id, lookup) => ({ video: await lookup() }), ...options }) };
}

test("unknown shared IDs cannot spend upstream quota without a shared reservation", async () => {
  for (const lookupSharedVideo of [undefined, async () => ({ video: null, unavailable: true })]) {
    const { load, calls } = setup({ recent: [ids.live], videos: [resource(ids.live), resource(ids.old)] });
    const feed = await load({ requestedId: ids.old, lookupSharedVideo });
    assert.equal(feed.selected, null);
    assert.equal(feed.recent[0].id, ids.live, "The ordinary feed remains available");
    assert.ok(feed.warning);
    assert.deepEqual(calls.filter(call => call.endpoint === "videos").map(call => call.ids), [[ids.live]]);
  }
});

test("known feed videos do not consume the shared-video lookup budget", async () => {
  const { load } = setup({ recent: [ids.live], videos: [resource(ids.live)] });
  const feed = await load({ requestedId: ids.live, lookupSharedVideo: async () => { assert.fail("No extra lookup expected"); } });
  assert.equal(feed.selected?.id, ids.live);
});

test("the current channel broadcast wins over an ended manual override", async () => {
  const { load } = setup({ live: [ids.live], videos: [resource(ids.live, "live"), resource(ids.old)] });
  const feed = await load({ manualIds: [ids.old] });
  assert.equal(feed.live?.id, ids.live);
  assert.equal(feed.recent[0]?.id, ids.old);
});

test("an ended broadcast is a replay even when its snippet still says live", async () => {
  const { load } = setup({ live: [ids.old], recent: [ids.old], videos: [resource(ids.old, "live", { liveStreamingDetails: { actualEndTime: "2026-09-14T14:00:00Z", concurrentViewers: "50" } })] });
  const feed = await load();
  assert.equal(feed.live, null);
  assert.equal(feed.recent[0].liveBroadcastContent, "none");
  assert.equal(feed.recent[0].concurrentViewers, undefined);
});

test("known upcoming broadcasts can become live without waiting for search discovery", async () => {
  const { load } = setup({ upcoming: [ids.next], videos: [resource(ids.next, "live")] });
  const feed = await load();
  assert.equal(feed.live?.id, ids.next);
  assert.deepEqual(feed.upcoming, []);
});

test("a manual video is never assumed to be live", async () => {
  const { load } = setup({ videos: [resource(ids.old)] });
  const feed = await load({ manualIds: [ids.old, "bad-id", ids.old] });
  assert.equal(feed.live, null);
  assert.equal(feed.recent.length, 1);
});

test("duplicate discovery results use one verified video resource", async () => {
  const { load, calls } = setup({ live: [ids.live], upcoming: [ids.live], recent: [ids.live], videos: [resource(ids.live, "live")] });
  await load();
  const metadata = calls.filter(call => call.endpoint === "videos");
  assert.equal(metadata.length, 1);
  assert.deepEqual(metadata[0].ids, [ids.live]);
  assert.equal(metadata[0].revalidate, VIDEO_CACHE_SECONDS);
  assert.ok(calls.filter(call => ["live", "upcoming"].includes(call.endpoint)).every(call => call.revalidate === DISCOVERY_CACHE_SECONDS));
});

test("partial discovery failure retains verified replays with a visible warning", async () => {
  const { load } = setup({ recent: [ids.old], videos: [resource(ids.old)], failures: ["live", "upcoming"] });
  const feed = await load();
  assert.equal(feed.recent[0].id, ids.old);
  assert.match(feed.warning!, /could not be checked/);
});

test("a full outage is an error instead of a successful empty schedule", async () => {
  const { load } = setup({ failures: ["live", "upcoming", "playlistItems"] });
  await assert.rejects(load, /unavailable/);
});

test("metadata failure cannot produce an unverified live badge", async () => {
  const { load } = setup({ live: [ids.live], failures: ["videos"] });
  await assert.rejects(load, /videos returned 403/);
});

test("missing configuration never falls back to stamping an oEmbed video live", async () => {
  await assert.rejects(() => loadYouTubeFeed({ apiKey: "", channelId, manualIds: [ids.live], request: async () => { assert.fail("No request expected"); } }), /not configured/);
});

test("a shared replay still resolves after it leaves recent uploads", async () => {
  const { load } = setup({ videos: [resource(ids.old, "none", { status: { embeddable: false } })] });
  const feed = await load({ requestedId: ids.old });
  assert.equal(feed.selected?.id, ids.old);
  assert.equal(feed.selected?.embeddable, false);
  assert.deepEqual(feed.recent, []);
});

test("shared links cannot embed a different channel or a private video", async () => {
  const { load } = setup({ videos: [resource(ids.other, "live", { snippet: { channelId: "UCdifferentChannel", title: "Unrelated" } }), resource(ids.old, "none", { status: { privacyStatus: "private" } })] });
  assert.equal((await load({ requestedId: ids.other })).selected, null);
  assert.equal((await load({ requestedId: ids.old })).selected, null);
});

test("past scheduled times do not imply a broadcast is live, and upcoming events are ordered", async () => {
  const { load } = setup({ upcoming: [ids.next, ids.old], videos: [resource(ids.next, "upcoming", { liveStreamingDetails: { scheduledStartTime: "2026-10-01T12:00:00Z" } }), resource(ids.old, "upcoming", { liveStreamingDetails: { scheduledStartTime: "2026-09-01T12:00:00Z" } })] });
  const feed = await load();
  assert.equal(feed.live, null);
  assert.deepEqual(feed.upcoming.map(video => video.id), [ids.old, ids.next]);
});

test("a valid empty channel remains an empty feed, not an outage", async () => {
  const feed = await setup().load();
  assert.deepEqual(feed, { live: null, upcoming: [], recent: [], selected: null });
});

test("captions keep the original capitalization of Nation names", () => {
  assert.equal(videoExcerpt("MOOSOMIN FIRST NATION https://example.com #live"), "MOOSOMIN FIRST NATION");
});
