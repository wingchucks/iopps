/**
 * Seed member profiles and mentor profiles into Firestore via REST API.
 * Usage: node scripts/seed-members.mjs
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

// ── Member Profiles ──────────────────────────────────────────────────
// These use fake UIDs (demo-*) since they aren't real Firebase Auth users.
// The members page uses getAllMembers() which reads from the members collection.
const members = [
  {
    uid: "demo-sarah-whitebear",
    displayName: "Sarah Whitebear",
    email: "sarah.whitebear@email.com",
    community: "Muskoday First Nation",
    location: "Saskatoon, SK",
    bio: "Regional Manager at SIGA. FNUniv Business Administration grad. Passionate about Indigenous economic development and mentoring the next generation of leaders.",
    interests: ["Business", "Leadership", "Indigenous Governance"],
    openToWork: false,
    skills: ["Strategic Planning", "Operations Management", "Community Engagement", "Budget Management"],
    education: [{ school: "First Nations University of Canada", degree: "Bachelor's", field: "Business Administration", year: 2020 }],
    headline: "Regional Manager at SIGA",
    joinedAt: ts,
    updatedAt: ts,
  },
  {
    uid: "demo-marcus-bear",
    displayName: "Marcus Bear",
    email: "marcus.bear@email.com",
    community: "Onion Lake Cree Nation",
    location: "Onion Lake, SK",
    bio: "Founded a land-based youth leadership program that has expanded to four communities. Former corporate consultant in Calgary. Committed to culturally grounded youth development.",
    interests: ["Youth Development", "Land-Based Learning", "Leadership"],
    openToWork: false,
    skills: ["Program Development", "Youth Mentorship", "Community Organizing", "Land-Based Education"],
    headline: "Founder, Nistam Youth Leadership",
    joinedAt: ts,
    updatedAt: ts,
  },
  {
    uid: "demo-jennifer-iron",
    displayName: "Jennifer Iron",
    email: "jennifer.iron@email.com",
    community: "Cowessess First Nation",
    location: "Saskatoon, SK",
    bio: "Saskatchewan's first Indigenous nurse practitioner in my region. Now mentoring nursing students through STC's health programs. Advocate for Indigenous health equity.",
    interests: ["Healthcare", "Nursing", "Mentorship"],
    openToWork: false,
    skills: ["Primary Care", "Community Health", "Cultural Safety", "Clinical Education"],
    education: [{ school: "University of Saskatchewan", degree: "Master's", field: "Nursing", year: 2018 }],
    headline: "Nurse Practitioner | STC Health Programs",
    joinedAt: ts,
    updatedAt: ts,
  },
  {
    uid: "demo-tyler-favel",
    displayName: "Tyler Favel",
    email: "tyler.favel@email.com",
    community: "Poundmaker Cree Nation",
    location: "North Battleford, SK",
    bio: "Red Seal electrician working on major infrastructure projects in northern Saskatchewan. Advocate for Indigenous youth entering the trades.",
    interests: ["Trades", "Construction", "Youth Mentorship"],
    openToWork: false,
    skills: ["Electrical Systems", "Project Management", "Safety Leadership", "Apprenticeship Training"],
    headline: "Red Seal Electrician | Northern Projects",
    joinedAt: ts,
    updatedAt: ts,
  },
  {
    uid: "demo-ashley-morin",
    displayName: "Ashley Morin",
    email: "ashley.morin@email.com",
    community: "Ahtahkakoop Cree Nation",
    location: "Prince Albert, SK",
    bio: "Social worker specializing in child welfare and family reunification. Working to transform how the child welfare system serves Indigenous families.",
    interests: ["Social Work", "Child Welfare", "Indigenous Rights"],
    openToWork: false,
    skills: ["Case Management", "Family Support", "Trauma-Informed Practice", "Policy Advocacy"],
    education: [{ school: "First Nations University of Canada", degree: "Bachelor's", field: "Indigenous Social Work", year: 2019 }],
    headline: "Social Worker | Child & Family Services",
    joinedAt: ts,
    updatedAt: ts,
  },
  {
    uid: "demo-cody-daniels",
    displayName: "Cody Daniels",
    email: "cody.daniels@email.com",
    community: "Mistawasis Nehiyawak",
    location: "Saskatoon, SK",
    bio: "Software developer building tools for First Nations communities. Currently developing band management software and community engagement platforms.",
    interests: ["Technology", "Software Development", "Community Tools"],
    openToWork: true,
    targetRoles: ["Full-Stack Developer", "Solutions Architect"],
    workPreference: "hybrid",
    skills: ["JavaScript", "React", "Node.js", "Firebase", "Cloud Architecture"],
    education: [{ school: "Saskatchewan Polytechnic", degree: "Diploma", field: "Computer Systems Technology", year: 2021 }],
    headline: "Full-Stack Developer",
    joinedAt: ts,
    updatedAt: ts,
  },
  {
    uid: "demo-rachel-bird",
    displayName: "Rachel Bird",
    email: "rachel.bird@email.com",
    community: "Kahkewistahaw First Nation",
    location: "Regina, SK",
    bio: "Environmental scientist focused on land reclamation and water quality monitoring in Treaty 4 territory. Working with Cameco on northern environmental assessments.",
    interests: ["Environment", "Science", "Treaty Rights"],
    openToWork: false,
    skills: ["Environmental Assessment", "Water Quality Analysis", "GIS Mapping", "Regulatory Compliance"],
    education: [{ school: "University of Regina", degree: "Master's", field: "Environmental Science", year: 2022 }],
    headline: "Environmental Scientist | Cameco",
    joinedAt: ts,
    updatedAt: ts,
  },
  {
    uid: "demo-kyle-starblanket",
    displayName: "Kyle Starblanket",
    email: "kyle.starblanket@email.com",
    community: "Star Blanket Cree Nation",
    location: "Saskatoon, SK",
    bio: "Policy analyst at FSIN focusing on Treaty rights and education policy. Former student body president at FNUniv. Passionate about Indigenous governance and self-determination.",
    interests: ["Policy", "Indigenous Governance", "Treaty Rights", "Education"],
    openToWork: false,
    skills: ["Policy Analysis", "Research", "Advocacy", "Public Speaking", "Grant Writing"],
    education: [{ school: "First Nations University of Canada", degree: "Bachelor's", field: "Indigenous Studies", year: 2020 }],
    headline: "Policy Analyst | FSIN",
    joinedAt: ts,
    updatedAt: ts,
  },
  {
    uid: "demo-brittany-lerat",
    displayName: "Brittany Lerat",
    email: "brittany.lerat@email.com",
    community: "M\u00e9tis Nation \u2014 Saskatchewan",
    location: "Saskatoon, SK",
    bio: "Graphic designer and M\u00e9tis artist. Running Painted Drum Media, a creative agency that helps Indigenous organizations build their brands and tell their stories.",
    interests: ["Arts & Culture", "Design", "Entrepreneurship"],
    openToWork: false,
    skills: ["Graphic Design", "Brand Strategy", "Photography", "Video Production", "Illustration"],
    headline: "Creative Director | Painted Drum Media",
    joinedAt: ts,
    updatedAt: ts,
  },
  {
    uid: "demo-jordan-campeau",
    displayName: "Jordan Campeau",
    email: "jordan.campeau@email.com",
    community: "Beardy's & Okemasis Cree Nation",
    location: "Saskatoon, SK",
    bio: "Recently graduated from Sask Polytech's welding program. Looking for apprenticeship opportunities in construction or mining. Eager to learn and grow in the trades.",
    interests: ["Trades", "Welding", "Mining"],
    openToWork: true,
    targetRoles: ["Welder Apprentice", "Construction Welder"],
    workPreference: "in-person",
    skills: ["MIG Welding", "TIG Welding", "Blueprint Reading", "Safety Protocols"],
    education: [{ school: "Saskatchewan Polytechnic", degree: "Certificate", field: "Welding", year: 2025 }],
    headline: "Welding Certificate Graduate | Seeking Apprenticeship",
    joinedAt: ts,
    updatedAt: ts,
  },
];

// ── Mentor Profiles ──────────────────────────────────────────────────
const mentors = [
  {
    id: "demo-sarah-whitebear",
    userId: "demo-sarah-whitebear",
    name: "Sarah Whitebear",
    avatar: "",
    expertise: ["Business", "Leadership", "Indigenous Governance"],
    bio: "Happy to mentor emerging Indigenous leaders and business professionals. 8+ years in gaming and hospitality management.",
    yearsExperience: 8,
    availability: "available",
    location: "Saskatoon, SK",
    maxMentees: 3,
    currentMentees: 1,
    createdAt: ts,
  },
  {
    id: "demo-jennifer-iron",
    userId: "demo-jennifer-iron",
    name: "Jennifer Iron",
    avatar: "",
    expertise: ["Health", "Education"],
    bio: "Mentoring Indigenous nursing and health sciences students. Passionate about increasing Indigenous representation in healthcare.",
    yearsExperience: 12,
    availability: "available",
    location: "Saskatoon, SK",
    maxMentees: 2,
    currentMentees: 1,
    createdAt: ts,
  },
  {
    id: "demo-marcus-bear",
    userId: "demo-marcus-bear",
    name: "Marcus Bear",
    avatar: "",
    expertise: ["Education", "Arts & Culture"],
    bio: "Mentoring youth workers and educators interested in land-based learning and culturally grounded programming.",
    yearsExperience: 10,
    availability: "limited",
    location: "Onion Lake, SK",
    maxMentees: 2,
    currentMentees: 2,
    createdAt: ts,
  },
  {
    id: "demo-kyle-starblanket",
    userId: "demo-kyle-starblanket",
    name: "Kyle Starblanket",
    avatar: "",
    expertise: ["Law", "Business"],
    bio: "Guiding students and early-career professionals interested in Indigenous governance, policy, and Treaty rights advocacy.",
    yearsExperience: 5,
    availability: "available",
    location: "Saskatoon, SK",
    maxMentees: 3,
    currentMentees: 0,
    createdAt: ts,
  },
  {
    id: "demo-tyler-favel",
    userId: "demo-tyler-favel",
    name: "Tyler Favel",
    avatar: "",
    expertise: ["Technology", "Business"],
    bio: "Mentoring Indigenous youth pursuing trades careers. Red Seal electrician with experience on major northern projects.",
    yearsExperience: 15,
    availability: "available",
    location: "North Battleford, SK",
    maxMentees: 4,
    currentMentees: 1,
    createdAt: ts,
  },
];

// ── Seed ─────────────────────────────────────────────────────────────
async function seed() {
  console.log("Seeding member profiles...");
  for (const member of members) {
    const { uid, ...data } = member;
    await setDoc("members", uid, { uid, ...data });
    process.stdout.write(".");
  }
  console.log(` ${members.length} members`);

  console.log("Seeding mentor profiles...");
  for (const mentor of mentors) {
    const { id, ...data } = mentor;
    await setDoc("mentor_profiles", id, data);
    process.stdout.write(".");
  }
  console.log(` ${mentors.length} mentors`);

  console.log("\nDone! Member & mentor data seeded.");
  console.log(`  ${members.length} member profiles`);
  console.log(`  ${mentors.length} mentor profiles`);
  console.log(`  ${members.filter(m => m.openToWork).length} members open to work`);
}

seed().catch((err) => { console.error("Seed failed:", err.message); process.exit(1); });
