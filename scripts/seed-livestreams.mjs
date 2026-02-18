/**
 * Seed livestreams into Firestore via REST API.
 * Usage: node scripts/seed-livestreams.mjs
 */

import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ── Auth ─────────────────────────────────────────────────────────────
const configPath = join(homedir(), ".config", "configstore", "firebase-tools.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const refreshToken = config.tokens?.refresh_token;
if (!refreshToken) { console.error("No refresh token. Run: npx firebase login"); process.exit(1); }

const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
    client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
  }),
});
const { access_token } = await tokenRes.json();
if (!access_token) { console.error("Failed to get access token."); process.exit(1); }
console.log("Authenticated.");

// ── REST helpers ─────────────────────────────────────────────────────
const PROJECT = "iopps-c2224";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "number") return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === "object") {
    if (val.__type === "serverTimestamp") return { timestampValue: new Date().toISOString() };
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v);
  return fields;
}

async function setDoc(collection, docId, data) {
  const res = await fetch(`${BASE}/${collection}/${docId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!res.ok) throw new Error(`Failed ${collection}/${docId}: ${res.status} ${await res.text()}`);
}

const ts = { __type: "serverTimestamp" };

// ── Livestreams ─────────────────────────────────────────────────────
const livestreams = [
  {
    id: "stream-career-pathways",
    title: "Career Pathways: From Community to Corporate",
    videoUrl: "",
    thumbnailUrl: "",
    description: "Join Sarah Whitebear and Kyle Starblanket as they share their journeys from First Nations communities to leadership roles in gaming, government, and policy. Live Q&A included.",
    scheduledDate: "March 5, 2026",
    status: "scheduled",
    category: "Interviews",
    duration: "60 min",
    viewCount: 0,
    createdAt: ts,
  },
  {
    id: "stream-trades-youth",
    title: "Trades Talk: Getting Your Start in the Skilled Trades",
    videoUrl: "",
    thumbnailUrl: "",
    description: "Tyler Favel (Red Seal Electrician) and Jordan Campeau (Welding grad) discuss apprenticeships, certifications, and what it takes to build a career in the trades.",
    scheduledDate: "March 12, 2026",
    status: "scheduled",
    category: "Interviews",
    duration: "45 min",
    viewCount: 0,
    createdAt: ts,
  },
  {
    id: "stream-water-protectors",
    title: "Water Protectors: Environmental Science in Treaty Territory",
    videoUrl: "",
    thumbnailUrl: "",
    description: "Rachel Bird shares her work monitoring water quality in northern Saskatchewan and discusses how Indigenous knowledge and western science can work together to protect the land.",
    scheduledDate: "February 20, 2026",
    status: "archived",
    category: "Community Stories",
    duration: "38 min",
    viewCount: 245,
    createdAt: ts,
  },
  {
    id: "stream-language-revitalization",
    title: "Keeping Our Languages Alive: Cree Language Revitalization",
    videoUrl: "",
    thumbnailUrl: "",
    description: "Elder Mary Fineday and language instructors discuss the state of n\u0113hiyaw\u0113win revitalization, immersion programs, and how technology can help preserve Indigenous languages.",
    scheduledDate: "February 6, 2026",
    status: "archived",
    category: "Community Stories",
    duration: "52 min",
    viewCount: 412,
    createdAt: ts,
  },
  {
    id: "stream-entrepreneur-panel",
    title: "Indigenous Entrepreneurs Panel: Building Businesses on Our Terms",
    videoUrl: "",
    thumbnailUrl: "",
    description: "A panel of Indigenous entrepreneurs including Brittany Lerat (Painted Drum Media) and Sweetgrass Catering discuss starting and growing businesses rooted in community.",
    scheduledDate: "January 22, 2026",
    status: "archived",
    category: "Events",
    duration: "75 min",
    viewCount: 318,
    createdAt: ts,
  },
  {
    id: "stream-tech-indigenous-communities",
    title: "Tech for Community: Building Digital Tools for First Nations",
    videoUrl: "",
    thumbnailUrl: "",
    description: "Cody Daniels walks through his journey building band management software and community platforms. How technology can serve Indigenous governance and community needs.",
    scheduledDate: "January 8, 2026",
    status: "archived",
    category: "Training",
    duration: "42 min",
    viewCount: 189,
    createdAt: ts,
  },
  {
    id: "stream-nursing-indigenous-health",
    title: "Indigenous Health Careers: Paths in Nursing & Community Health",
    videoUrl: "",
    thumbnailUrl: "",
    description: "Jennifer Iron shares her journey to becoming a nurse practitioner and discusses pathways into healthcare for Indigenous students. Includes information about STC health program scholarships.",
    scheduledDate: "December 11, 2025",
    status: "archived",
    category: "Interviews",
    duration: "48 min",
    viewCount: 527,
    createdAt: ts,
  },
  {
    id: "stream-year-in-review-2025",
    title: "IOPPS Year in Review 2025",
    videoUrl: "",
    thumbnailUrl: "",
    description: "A look back at the IOPPS community's achievements in 2025 \u2014 new partnerships, member milestones, and the impact of Indigenous professional networking.",
    scheduledDate: "December 20, 2025",
    status: "archived",
    category: "Events",
    duration: "32 min",
    viewCount: 684,
    createdAt: ts,
  },
];

// ── Seed ─────────────────────────────────────────────────────────────
async function seed() {
  console.log("Seeding livestreams...");
  for (const stream of livestreams) {
    const { id, ...data } = stream;
    await setDoc("livestreams", id, data);
    process.stdout.write(".");
  }
  console.log(` ${livestreams.length} livestreams`);

  console.log("\nDone! Livestream data seeded.");
  console.log(`  ${livestreams.length} total`);
  console.log(`  ${livestreams.filter(s => s.status === "scheduled").length} scheduled`);
  console.log(`  ${livestreams.filter(s => s.status === "archived").length} archived`);
  console.log(`  Categories: ${[...new Set(livestreams.map(s => s.category))].join(", ")}`);
}

seed().catch((err) => { console.error("Seed failed:", err.message); process.exit(1); });
