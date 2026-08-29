import assert from "node:assert/strict";
import test from "node:test";

import {
  createHermesEventHideFirestoreAdapter,
  hermesEventHideIdempotencyDocumentId,
} from "../src/lib/server/hermes-event-hide-firestore.ts";
import { applyHermesEventHide, EVENT_HIDE_CONFIRMATION, reviewHermesEventHide } from "../src/lib/server/hermes-event-hide.ts";
import type { HermesFirestorePort, HermesFirestorePortTransaction } from "../src/lib/server/hermes-firestore-adapter.ts";

interface Stored { version: string; data: Record<string, unknown> }
function memoryPort(seed: Record<string, Record<string, Stored>>) {
  const store = new Map(Object.entries(structuredClone(seed)).map(([c, docs]) => [c, new Map(Object.entries(docs))]));
  let version = 10;
  let eventWrites = 0;
  let outsideReads = 0;
  const read = (source: typeof store, c: string, id: string) => {
    const value = source.get(c)?.get(id);
    return value ? { id, version: value.version, data: structuredClone(value.data) } : null;
  };
  const write = (source: typeof store, c: string, id: string, data: Record<string, unknown>, merge: boolean) => {
    const docs = source.get(c) ?? new Map<string, Stored>(); source.set(c, docs);
    const old = docs.get(id);
    docs.set(id, { version: `v${++version}`, data: merge ? { ...(old?.data ?? {}), ...structuredClone(data) } : structuredClone(data) });
    if (c === "events") eventWrites += 1;
  };
  const port: HermesFirestorePort = {
    async getDocument(c, id) { outsideReads += 1; return read(store, c, id); },
    async queryExact() { return []; },
    async queryExactFields() { return []; },
    async runTransaction<T>(handler: (tx: HermesFirestorePortTransaction) => Promise<T>) {
      const working = new Map([...store].map(([c, docs]) => [c, new Map(structuredClone([...docs]))]));
      const tx: HermesFirestorePortTransaction = {
        async getDocument(c, id) { return read(working, c, id); },
        setDocument(c, id, data, options) { write(working, c, id, data, options?.merge === true); },
        updateDocument(c, id, data) { write(working, c, id, data, true); },
      };
      const result = await handler(tx);
      store.clear(); for (const entry of working) store.set(...entry);
      return result;
    },
  };
  return { port, get: (c: string, id: string) => store.get(c)?.get(id), ids: (c: string) => [...(store.get(c)?.keys() ?? [])], eventWrites: () => eventWrites, outsideReads: () => outsideReads };
}

const command = { eventId: "OJfFAuFhEn4IW2DFOOKE", title: "Conference", organization: "IOPPS", type: "event", status: "active" } as const;
const execution = { keyId: "primary", idempotencyKey: "hide-old-duplicate", requestHash: "a".repeat(64) };

test("event-hide transaction changes only soft-hide fields, audits safely, and verifies readback", async () => {
  const memory = memoryPort({ events: {
    [command.eventId]: { version: "p1", data: { title: command.title, organizerName: command.organization, status: "active", active: true, body: "preserve", contactEmail: "private@example.com", createdAt: "keep" } },
    uFxstd8m7A5NBLXBDKRZ: { version: "p2", data: { title: command.title, orgName: command.organization, type: "event", status: "active", active: true } },
  } });
  const timestamp = new Date("2026-08-29T12:00:00.000Z");
  const adapter = createHermesEventHideFirestoreAdapter(memory.port, { now: () => timestamp });
  const deps = adapter.createServiceDeps({ reviewSecret: "s".repeat(64), execution });
  const reviewed = await reviewHermesEventHide(command, deps);
  assert.equal(reviewed.ok, true); if (!reviewed.ok) return;
  const applied = await applyHermesEventHide({ command, reviewToken: reviewed.reviewToken, confirmation: EVENT_HIDE_CONFIRMATION }, deps);
  assert.equal(applied.ok, true); if (!applied.ok) return;
  assert.equal(applied.status, "applied");
  assert.deepEqual(memory.get("events", command.eventId)?.data, {
    title: command.title, organizerName: command.organization, status: "hidden", active: false,
    body: "preserve", contactEmail: "private@example.com", createdAt: "keep", hiddenAt: timestamp, updatedAt: timestamp,
  });
  assert.equal(memory.get("events", "uFxstd8m7A5NBLXBDKRZ")?.data.status, "active");
  assert.equal(memory.eventWrites(), 1);
  assert.ok(memory.outsideReads() >= 2);
  const id = hermesEventHideIdempotencyDocumentId(execution);
  assert.deepEqual(memory.ids("hermesAdminAudit"), [id]);
  const audit = memory.get("hermesAdminAudit", id)?.data ?? {};
  assert.deepEqual(audit.changedFields, ["active", "hiddenAt", "status", "updatedAt"]);
  const serialized = JSON.stringify(audit).toLowerCase();
  for (const forbidden of ["private@example.com", reviewed.reviewToken.toLowerCase(), "signature", "nonce"]) assert.equal(serialized.includes(forbidden), false);
  const cached = await adapter.getIdempotentApply(execution);
  assert.equal(cached?.status, "applied");
  assert.equal(cached?.verified.status, "hidden");
});

test("an active event without the legacy active mirror can still be transactionally hidden", async () => {
  const memory = memoryPort({ events: {
    [command.eventId]: { version: "p1", data: { title: command.title, orgName: command.organization, type: "event", status: "active", keep: true } },
  } });
  const adapter = createHermesEventHideFirestoreAdapter(memory.port);
  const deps = adapter.createServiceDeps({
    reviewSecret: "s".repeat(64),
    execution: { ...execution, idempotencyKey: "legacy-active-mirror" },
  });
  const reviewed = await reviewHermesEventHide(command, deps);
  assert.equal(reviewed.ok, true); if (!reviewed.ok) return;
  assert.equal(reviewed.current.active, true);
  const applied = await applyHermesEventHide({
    command,
    reviewToken: reviewed.reviewToken,
    confirmation: EVENT_HIDE_CONFIRMATION,
  }, deps);
  assert.equal(applied.ok, true); if (!applied.ok) return;
  assert.equal(applied.status, "applied");
  assert.equal(memory.get("events", command.eventId)?.data.status, "hidden");
  assert.equal(memory.get("events", command.eventId)?.data.active, false);
  assert.equal(memory.get("events", command.eventId)?.data.keep, true);
});

test("an already hidden exact event is a verified no-op with no event mutation", async () => {
  const hiddenCommand = { ...command, status: "hidden" as const };
  const memory = memoryPort({ events: { [command.eventId]: { version: "p1", data: { title: command.title, orgName: command.organization, type: "event", status: "hidden", active: false, hiddenAt: "earlier", keep: true } } } });
  const adapter = createHermesEventHideFirestoreAdapter(memory.port);
  const deps = adapter.createServiceDeps({ reviewSecret: "s".repeat(64), execution: { ...execution, idempotencyKey: "noop" } });
  const reviewed = await reviewHermesEventHide(hiddenCommand, deps);
  assert.equal(reviewed.ok, true); if (!reviewed.ok) return;
  const applied = await applyHermesEventHide({ command: hiddenCommand, reviewToken: reviewed.reviewToken, confirmation: EVENT_HIDE_CONFIRMATION }, deps);
  assert.equal(applied.ok, true); if (!applied.ok) return;
  assert.equal(applied.status, "verified_noop");
  assert.equal(memory.eventWrites(), 0);
});
