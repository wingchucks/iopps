import assert from "node:assert/strict";
import test from "node:test";

import {
  applyHermesEventHide,
  EVENT_HIDE_CONFIRMATION,
  normalizeHermesEventHideCommand,
  reviewHermesEventHide,
  type HermesEventHideDocument,
  type HermesEventHideServiceDeps,
} from "../src/lib/server/hermes-event-hide.ts";

const reviewSecret = "s".repeat(64);
const command = {
  eventId: "OJfFAuFhEn4IW2DFOOKE",
  title: "Indigenous Opportunities Conference",
  organization: "IOPPS",
  type: "event",
  status: "active",
} as const;

function eventDoc(version = "p1", data: Record<string, unknown> = {}): HermesEventHideDocument {
  return {
    id: command.eventId,
    version,
    data: {
      title: command.title,
      orgName: command.organization,
      type: command.type,
      status: command.status,
      active: true,
      privateContact: "must-not-leak@example.com",
      ...data,
    },
  };
}

function deps(overrides: Partial<HermesEventHideServiceDeps> = {}): HermesEventHideServiceDeps {
  return {
    reviewSecret,
    getEvent: async () => eventDoc(),
    commit: async () => ({
      status: "applied",
      committedAt: "2026-08-29T12:00:00.000Z",
      verified: { id: command.eventId, title: command.title, organization: command.organization, type: "event", status: "hidden", active: false },
    }),
    ...overrides,
  };
}

test("event-hide review resolves one exact event and returns safe current and desired projections", async () => {
  const reviewed = await reviewHermesEventHide(command, deps());
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  assert.deepEqual(reviewed.current, {
    id: command.eventId,
    title: command.title,
    organization: command.organization,
    type: "event",
    status: "active",
    active: true,
  });
  assert.deepEqual(reviewed.desired, { ...reviewed.current, status: "hidden", active: false });
  assert.match(reviewed.reviewToken, /^v1\.[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(Object.keys(reviewed).sort(), ["current", "desired", "ok", "reviewToken"]);
  assert.equal(JSON.stringify(reviewed).includes("must-not-leak@example.com"), false);
});

test("event-hide command requires exact ID, title, organization, type, and supported exact status", () => {
  assert.deepEqual(normalizeHermesEventHideCommand(command), { ok: true, command });
  for (const invalid of [
    {},
    { ...command, eventId: "" },
    { ...command, eventId: "a/b" },
    { ...command, title: "" },
    { ...command, organization: "" },
    { ...command, type: "conference" },
    { ...command, status: "draft" },
    { ...command, extra: true },
  ]) assert.equal(normalizeHermesEventHideCommand(invalid).ok, false);
});

test("event-hide review accepts a status-active event when the legacy active mirror is absent", async () => {
  const reviewed = await reviewHermesEventHide(command, deps({
    getEvent: async () => eventDoc("legacy", { active: undefined }),
  }));
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  assert.equal(reviewed.current.status, "active");
  assert.equal(reviewed.current.active, true);
  assert.deepEqual(reviewed.desired, { ...reviewed.current, status: "hidden", active: false });
});

test("event-hide review resolves the organization from an exact organizerName event field", async () => {
  const reviewed = await reviewHermesEventHide(command, deps({
    getEvent: async () => eventDoc("organizer", { orgName: undefined, organizerName: command.organization, type: undefined }),
  }));
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  assert.equal(reviewed.current.organization, command.organization);
});

test("event-hide review rejects any exact identity or projection mismatch", async () => {
  const cases: Array<[HermesEventHideDocument | null, number]> = [
    [null, 404],
    [{ ...eventDoc(), id: "uFxstd8m7A5NBLXBDKRZ" }, 409],
    [eventDoc("p1", { title: "Different" }), 409],
    [eventDoc("p1", { title: ` ${command.title}` }), 409],
    [eventDoc("p1", { orgName: "Different" }), 409],
    [eventDoc("p1", { orgName: `${command.organization} ` }), 409],
    [eventDoc("p1", { type: "job" }), 409],
    [eventDoc("p1", { status: "draft" }), 409],
    [eventDoc("p1", { active: false }), 409],
    [eventDoc("p1", { active: null }), 409],
    [eventDoc("p1", { active: "yes" }), 409],
  ];
  for (const [document, status] of cases) {
    const reviewed = await reviewHermesEventHide(command, deps({ getEvent: async () => document }));
    assert.equal(reviewed.ok, false);
    assert.equal(reviewed.status, status);
  }
});

test("event-hide apply requires exact command, token, and confirmation and rejects stale state", async () => {
  const reviewed = await reviewHermesEventHide(command, deps());
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  for (const invalid of [
    { command, reviewToken: reviewed.reviewToken, confirmation: "hide" },
    { command, reviewToken: "", confirmation: EVENT_HIDE_CONFIRMATION },
    { command, reviewToken: reviewed.reviewToken, confirmation: EVENT_HIDE_CONFIRMATION, extra: true },
  ]) {
    const result = await applyHermesEventHide(invalid, deps());
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
  }
  let commits = 0;
  for (const changed of [
    eventDoc("p2"),
    eventDoc("p1", { title: "Changed" }),
    eventDoc("p1", { orgName: "Changed" }),
    eventDoc("p1", { type: "conference" }),
    eventDoc("p1", { status: "draft" }),
  ]) {
    const stale = await applyHermesEventHide({
      command,
      reviewToken: reviewed.reviewToken,
      confirmation: EVENT_HIDE_CONFIRMATION,
    }, deps({
      getEvent: async () => changed,
      commit: async () => { commits += 1; throw new Error("must not commit"); },
    }));
    assert.deepEqual(stale, { ok: false, status: 409, error: "Review token is invalid or stale" });
  }
  assert.equal(commits, 0);
});

test("an already hidden exact event can be reviewed and applied as a verified no-op", async () => {
  const hiddenCommand = { ...command, status: "hidden" as const };
  const hidden = eventDoc("p-hidden", { status: "hidden", active: false });
  let commits = 0;
  const hiddenDeps = deps({
    getEvent: async () => hidden,
    commit: async () => {
      commits += 1;
      return {
        status: "verified_noop",
        verified: { id: command.eventId, title: command.title, organization: command.organization, type: "event", status: "hidden", active: false },
      };
    },
  });
  const reviewed = await reviewHermesEventHide(hiddenCommand, hiddenDeps);
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  const applied = await applyHermesEventHide({
    command: hiddenCommand,
    reviewToken: reviewed.reviewToken,
    confirmation: EVENT_HIDE_CONFIRMATION,
  }, hiddenDeps);
  assert.equal(applied.ok, true);
  if (!applied.ok) return;
  assert.equal(applied.status, "verified_noop");
  assert.equal(commits, 1);
});
