#!/usr/bin/env node
/**
 * M-3 — Scholarship ingest audit.
 *
 * Reports how many scholarships are missing a parsed amount, a parsed
 * deadline, or both — and for each missing field, scans the description /
 * eligibility / applicationInstructions free text for probable unparsed
 * values so the scraper team knows where to aim.
 *
 * Read-only. Safe to run against production without --apply.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node scripts/audit-scholarship-ingest.cjs
 */

const admin = require("firebase-admin");

const AMOUNT_PATTERNS = [
  /\$\s?([\d,]+(?:\.\d+)?)(?:\s?-\s?\$?\s?([\d,]+(?:\.\d+)?))?/i,
  /\bCAD?\s?\$?\s?([\d,]+(?:\.\d+)?)/i,
  /\b([\d,]+)\s?dollars?\b/i,
];

const DEADLINE_PATTERNS = [
  // "April 15, 2026", "Apr 15 2026", "15 April 2026"
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?\b/i,
  /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/i,
  // "2026-04-15", "04/15/2026"
  /\b\d{4}-\d{2}-\d{2}\b/,
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
  // "deadline: <anything until newline>"
  /deadline[:\s]+([^\n.]{3,40})/i,
];

function isMissingAmount(data) {
  const amount = data.amount;
  if (amount === null || amount === undefined) return true;
  if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) return false;
  if (typeof amount === "string" && amount.trim()) {
    const n = Number(String(amount).replace(/[^\d.]/g, ""));
    return !(Number.isFinite(n) && n > 0);
  }
  return true;
}

function hasParsableDeadline(data) {
  if (!data.deadline) return false;
  const s = String(data.deadline).trim();
  if (!s) return false;
  return !Number.isNaN(new Date(s).getTime());
}

function findUnparsed(text, patterns) {
  if (!text || typeof text !== "string") return null;
  for (const pattern of patterns) {
    const m = pattern.exec(text);
    if (m) return m[0];
  }
  return null;
}

async function main() {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
  const db = admin.firestore();

  const snap = await db.collection("scholarships").get();
  console.log(`Loaded ${snap.size} scholarship records.`);

  let missingAmount = 0;
  let missingDeadline = 0;
  let missingBoth = 0;
  const recoverable = [];

  for (const d of snap.docs) {
    const data = d.data() || {};
    const noAmount = isMissingAmount(data);
    const noDeadline = !hasParsableDeadline(data);
    if (noAmount) missingAmount++;
    if (noDeadline) missingDeadline++;
    if (noAmount && noDeadline) missingBoth++;

    const freeText = [data.description, data.eligibility, data.applicationInstructions]
      .filter((v) => typeof v === "string")
      .join(" ");

    const amountHit = noAmount ? findUnparsed(freeText, AMOUNT_PATTERNS) : null;
    const deadlineHit = noDeadline ? findUnparsed(freeText, DEADLINE_PATTERNS) : null;

    if (amountHit || deadlineHit) {
      recoverable.push({
        id: d.id,
        title: String(data.title || "").slice(0, 60),
        amountHit,
        deadlineHit,
      });
    }
  }

  console.log("");
  console.log("Coverage:");
  console.log(`  missing amount:   ${missingAmount} / ${snap.size}`);
  console.log(`  missing deadline: ${missingDeadline} / ${snap.size}`);
  console.log(`  missing both:     ${missingBoth} / ${snap.size}`);
  console.log("");
  console.log(`Recoverable from free-text (${recoverable.length}):`);
  for (const row of recoverable.slice(0, 30)) {
    console.log(`  ${row.id}  ${row.title}`);
    if (row.amountHit) console.log(`     amount → ${row.amountHit}`);
    if (row.deadlineHit) console.log(`     deadline → ${row.deadlineHit}`);
  }
  if (recoverable.length > 30) {
    console.log(`  ...and ${recoverable.length - 30} more`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
