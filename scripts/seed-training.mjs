/**
 * Seed training programs into Firestore via REST API.
 * Usage: node scripts/seed-training.mjs
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

// ── Training Programs ───────────────────────────────────────────────
const programs = [
  {
    id: "intro-web-development",
    title: "Introduction to Web Development",
    slug: "intro-web-development",
    description: "Learn the fundamentals of HTML, CSS, and JavaScript in this beginner-friendly program designed for Indigenous youth and career changers. Build your own portfolio website by the end of the course.",
    category: "Technology",
    format: "online",
    instructor: {
      name: "Cody Daniels",
      title: "Full-Stack Developer",
      bio: "Software developer building tools for First Nations communities.",
      avatar: "",
    },
    duration: "8 weeks",
    modules: [
      { title: "HTML Foundations", description: "Structure web pages with semantic HTML5", duration: "1 week" },
      { title: "CSS Styling", description: "Layout, flexbox, grid, and responsive design", duration: "2 weeks" },
      { title: "JavaScript Basics", description: "Variables, functions, DOM manipulation", duration: "2 weeks" },
      { title: "Portfolio Project", description: "Build and deploy your personal portfolio", duration: "3 weeks" },
    ],
    enrollmentCount: 24,
    maxEnrollment: 30,
    prerequisites: [],
    skills: ["HTML", "CSS", "JavaScript", "Responsive Design"],
    certificateOffered: true,
    orgId: "org-treaty-tech",
    orgName: "Treaty Tech Solutions",
    location: "Online",
    startDate: "2026-03-15",
    endDate: "2026-05-10",
    price: null,
    featured: true,
    active: true,
    createdAt: ts,
  },
  {
    id: "indigenous-business-essentials",
    title: "Indigenous Business Essentials",
    slug: "indigenous-business-essentials",
    description: "A comprehensive program covering business planning, funding proposals, and financial management tailored for Indigenous entrepreneurs and community economic development officers.",
    category: "Business",
    format: "hybrid",
    instructor: {
      name: "Sarah Whitebear",
      title: "Regional Manager, SIGA",
      bio: "8+ years in gaming and hospitality management with a focus on Indigenous economic development.",
      avatar: "",
    },
    duration: "12 weeks",
    modules: [
      { title: "Business Planning 101", description: "Crafting a business plan that reflects community values", duration: "3 weeks" },
      { title: "Funding & Grants", description: "Navigating ISED, NACCA, and tribal council funding", duration: "3 weeks" },
      { title: "Financial Management", description: "Bookkeeping, budgeting, and cash flow", duration: "3 weeks" },
      { title: "Marketing & Branding", description: "Building your Indigenous brand identity", duration: "3 weeks" },
    ],
    enrollmentCount: 18,
    maxEnrollment: 25,
    prerequisites: [],
    skills: ["Business Planning", "Grant Writing", "Financial Management", "Marketing"],
    certificateOffered: true,
    orgId: "org-fnuniv",
    orgName: "First Nations University of Canada",
    location: "Saskatoon, SK",
    startDate: "2026-04-01",
    endDate: "2026-06-24",
    price: 250,
    featured: true,
    active: true,
    createdAt: ts,
  },
  {
    id: "welding-safety-fundamentals",
    title: "Welding Safety Fundamentals",
    slug: "welding-safety-fundamentals",
    description: "Pre-apprenticeship welding safety certification program. Covers WHMIS, fall protection, confined spaces, and welding-specific safety protocols required for job sites.",
    category: "Trades",
    format: "in-person",
    instructor: {
      name: "Tyler Favel",
      title: "Red Seal Electrician",
      bio: "15 years of experience on major northern infrastructure projects.",
      avatar: "",
    },
    duration: "2 weeks",
    modules: [
      { title: "WHMIS & Workplace Hazards", description: "Chemical safety, labeling, and hazard identification", duration: "2 days" },
      { title: "Fall Protection & Confined Spaces", description: "Working at heights and in confined areas safely", duration: "2 days" },
      { title: "Welding Safety Protocols", description: "PPE, ventilation, fire prevention, and arc safety", duration: "3 days" },
      { title: "Practical Assessment", description: "Hands-on safety demonstration and written exam", duration: "3 days" },
    ],
    enrollmentCount: 12,
    maxEnrollment: 15,
    prerequisites: ["Must be 18+"],
    skills: ["WHMIS", "Fall Protection", "Confined Space Entry", "Welding Safety"],
    certificateOffered: true,
    orgId: "org-sask-polytech",
    orgName: "Saskatchewan Polytechnic",
    location: "Prince Albert, SK",
    startDate: "2026-03-03",
    endDate: "2026-03-14",
    price: null,
    featured: true,
    active: true,
    createdAt: ts,
  },
  {
    id: "community-health-worker",
    title: "Community Health Worker Certificate",
    slug: "community-health-worker",
    description: "Prepare for a career as a community health representative. Covers health promotion, chronic disease management, mental health first aid, and culturally safe care practices.",
    category: "Health",
    format: "hybrid",
    instructor: {
      name: "Jennifer Iron",
      title: "Nurse Practitioner, STC Health Programs",
      bio: "Saskatchewan's first Indigenous nurse practitioner in her region, dedicated to Indigenous health equity.",
      avatar: "",
    },
    duration: "16 weeks",
    modules: [
      { title: "Health Promotion", description: "Community health assessment and health promotion strategies", duration: "4 weeks" },
      { title: "Chronic Disease Management", description: "Diabetes, heart disease, and respiratory illness in Indigenous communities", duration: "4 weeks" },
      { title: "Mental Health First Aid", description: "Crisis intervention, suicide prevention, and trauma-informed care", duration: "4 weeks" },
      { title: "Practicum", description: "Supervised placement in a community health setting", duration: "4 weeks" },
    ],
    enrollmentCount: 8,
    maxEnrollment: 20,
    prerequisites: ["High school diploma or equivalent", "First Aid/CPR (or willingness to obtain)"],
    skills: ["Health Promotion", "Chronic Disease Management", "Mental Health First Aid", "Cultural Safety"],
    certificateOffered: true,
    orgId: "org-stc",
    orgName: "Saskatoon Tribal Council",
    location: "Saskatoon, SK",
    startDate: "2026-04-14",
    endDate: "2026-08-07",
    price: null,
    featured: false,
    active: true,
    createdAt: ts,
  },
  {
    id: "cree-language-revitalization",
    title: "n\u0113hiyaw\u0113win: Cree Language for Beginners",
    slug: "cree-language-revitalization",
    description: "An introductory Plains Cree language course covering basic conversational skills, syllabics, greetings, kinship terms, and land-based vocabulary. Taught by fluent Elders and language keepers.",
    category: "Culture",
    format: "hybrid",
    instructor: {
      name: "Elder Mary Fineday",
      title: "Cree Language Keeper",
      bio: "Fluent n\u0113hiyaw\u0113win speaker and language instructor with over 30 years of teaching experience.",
      avatar: "",
    },
    duration: "10 weeks",
    modules: [
      { title: "Greetings & Introductions", description: "Basic phrases, pronunciation, and syllabics", duration: "2 weeks" },
      { title: "Kinship & Community", description: "Family terms, community roles, and social phrases", duration: "3 weeks" },
      { title: "Land & Nature", description: "Animals, plants, seasons, and land-based vocabulary", duration: "3 weeks" },
      { title: "Conversational Practice", description: "Dialogue practice with Elders and language keepers", duration: "2 weeks" },
    ],
    enrollmentCount: 32,
    maxEnrollment: 40,
    prerequisites: [],
    skills: ["Plains Cree Basics", "Syllabics Reading", "Conversational Cree"],
    certificateOffered: true,
    orgId: "org-fnuniv",
    orgName: "First Nations University of Canada",
    location: "Saskatoon, SK",
    startDate: "2026-03-10",
    endDate: "2026-05-18",
    price: null,
    featured: false,
    active: true,
    createdAt: ts,
  },
  {
    id: "data-analytics-indigenous-orgs",
    title: "Data Analytics for Indigenous Organizations",
    slug: "data-analytics-indigenous-orgs",
    description: "Learn to collect, analyze, and present data to support community decision-making. Covers Excel, data visualization, and reporting for band offices, tribal councils, and Indigenous non-profits.",
    category: "Technology",
    format: "online",
    instructor: {
      name: "Rachel Bird",
      title: "Environmental Scientist, Cameco",
      bio: "Environmental scientist focused on data analysis and reporting in Treaty 4 territory.",
      avatar: "",
    },
    duration: "6 weeks",
    modules: [
      { title: "Data Fundamentals", description: "Data types, collection methods, and data sovereignty", duration: "1 week" },
      { title: "Spreadsheet Mastery", description: "Advanced Excel for community data management", duration: "2 weeks" },
      { title: "Data Visualization", description: "Creating charts, dashboards, and visual reports", duration: "2 weeks" },
      { title: "Reporting & Presentation", description: "Building reports for funders and community members", duration: "1 week" },
    ],
    enrollmentCount: 15,
    maxEnrollment: null,
    prerequisites: ["Basic computer skills"],
    skills: ["Excel", "Data Analysis", "Data Visualization", "Report Writing"],
    certificateOffered: true,
    orgId: "org-treaty-tech",
    orgName: "Treaty Tech Solutions",
    location: "Online",
    startDate: "2026-03-24",
    endDate: "2026-05-02",
    price: 150,
    featured: false,
    active: true,
    createdAt: ts,
  },
  {
    id: "heavy-equipment-operator",
    title: "Heavy Equipment Operator Readiness",
    slug: "heavy-equipment-operator",
    description: "Prepare for a career operating heavy equipment in mining, construction, and road building. Includes classroom instruction and hands-on training with skid steers, excavators, and loaders.",
    category: "Trades",
    format: "in-person",
    instructor: {
      name: "Wayne Machiskinic",
      title: "Heavy Equipment Instructor",
      bio: "20+ years operating heavy equipment in Saskatchewan's mining and construction industries.",
      avatar: "",
    },
    duration: "4 weeks",
    modules: [
      { title: "Equipment Fundamentals", description: "Types of heavy equipment, components, and pre-operation checks", duration: "1 week" },
      { title: "Safety & Regulations", description: "WorkSafe SK regulations, site safety, and signaling", duration: "3 days" },
      { title: "Hands-On Operation", description: "Supervised operation of excavators, loaders, and skid steers", duration: "2 weeks" },
      { title: "Assessment & Certification", description: "Written exam and practical demonstration", duration: "4 days" },
    ],
    enrollmentCount: 10,
    maxEnrollment: 12,
    prerequisites: ["Valid Class 5 driver's licence", "Must be 18+"],
    skills: ["Excavator Operation", "Loader Operation", "Site Safety", "Equipment Maintenance"],
    certificateOffered: true,
    orgId: "org-sask-polytech",
    orgName: "Saskatchewan Polytechnic",
    location: "North Battleford, SK",
    startDate: "2026-05-04",
    endDate: "2026-05-29",
    price: null,
    featured: false,
    active: true,
    createdAt: ts,
  },
  {
    id: "graphic-design-indigenous-brand",
    title: "Graphic Design for Indigenous Brands",
    slug: "graphic-design-indigenous-brand",
    description: "Learn graphic design fundamentals using Canva and Adobe tools. Create logos, social media content, and print materials that authentically represent Indigenous organizations and businesses.",
    category: "Business",
    format: "online",
    instructor: {
      name: "Brittany Lerat",
      title: "Creative Director, Painted Drum Media",
      bio: "M\u00e9tis graphic designer and artist running a creative agency helping Indigenous organizations build their brands.",
      avatar: "",
    },
    duration: "6 weeks",
    modules: [
      { title: "Design Principles", description: "Color theory, typography, and layout fundamentals", duration: "1 week" },
      { title: "Logo & Brand Identity", description: "Creating culturally authentic logos and brand guides", duration: "2 weeks" },
      { title: "Social Media Design", description: "Templates and content creation for social platforms", duration: "2 weeks" },
      { title: "Print & Production", description: "Business cards, posters, banners, and print-ready files", duration: "1 week" },
    ],
    enrollmentCount: 20,
    maxEnrollment: null,
    prerequisites: [],
    skills: ["Graphic Design", "Canva", "Adobe Illustrator", "Brand Identity"],
    certificateOffered: false,
    orgId: "org-painted-drum",
    orgName: "Painted Drum Media",
    location: "Online",
    startDate: "2026-04-07",
    endDate: "2026-05-18",
    price: 175,
    featured: false,
    active: true,
    createdAt: ts,
  },
];

// ── Seed ─────────────────────────────────────────────────────────────
async function seed() {
  console.log("Seeding training programs...");
  for (const program of programs) {
    const { id, ...data } = program;
    await setDoc("training_programs", id, data);
    process.stdout.write(".");
  }
  console.log(` ${programs.length} programs`);

  console.log("\nDone! Training data seeded.");
  console.log(`  ${programs.length} training programs`);
  console.log(`  ${programs.filter(p => p.featured).length} featured`);
  console.log(`  Categories: ${[...new Set(programs.map(p => p.category))].join(", ")}`);
  console.log(`  Formats: ${[...new Set(programs.map(p => p.format))].join(", ")}`);
}

seed().catch((err) => { console.error("Seed failed:", err.message); process.exit(1); });
