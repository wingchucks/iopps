/**
 * Seed script — populates Firestore with demo data.
 * Uses Firestore REST API with Firebase CLI credentials.
 *
 * Usage:  npx firebase login  (if not already logged in)
 *         node scripts/seed.mjs
 */

import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ── Auth: get access token from Firebase CLI refresh token ────────────
const configPath = join(homedir(), ".config", "configstore", "firebase-tools.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const refreshToken = config.tokens?.refresh_token;
if (!refreshToken) {
  console.error("No refresh token found. Run: npx firebase login");
  process.exit(1);
}

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
if (!access_token) {
  console.error("Failed to get access token. Try: npx firebase login --reauth");
  process.exit(1);
}
console.log("Authenticated with Firebase CLI credentials.");

// ── Firestore REST helpers ───────────────────────────────────────────
const PROJECT = "iopps-c2224";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

/** Convert a JS value to a Firestore REST Value object */
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "number") {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === "boolean") return { booleanValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    // Check for our server timestamp sentinel
    if (val.__type === "serverTimestamp") {
      return { timestampValue: new Date().toISOString() };
    }
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

/** Convert a flat JS object to Firestore document fields */
function toFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = toFirestoreValue(v);
  }
  return fields;
}

/** Write a document at a specific path (creates or overwrites) */
async function setDoc(collection, docId, data) {
  const url = `${BASE}/${collection}/${docId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to write ${collection}/${docId}: ${res.status} ${err}`);
  }
}

/** Add a document with auto-generated ID */
async function addDoc(collection, data) {
  const url = `${BASE}/${collection}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to add to ${collection}: ${res.status} ${err}`);
  }
}

// Sentinel for server timestamp (we'll use current time)
const ts = { __type: "serverTimestamp" };

// ── Organizations ──────────────────────────────────────────────────────
const orgs = [
  {
    id: "siga",
    name: "Saskatchewan Indian Gaming Authority",
    shortName: "SIGA",
    type: "employer",
    tier: "premium",
    location: "Saskatoon, SK",
    website: "siga.ca",
    description:
      "SIGA operates seven casinos across Saskatchewan, employing over 4,000 people. As the province's largest employer of Indigenous people, SIGA is committed to Indigenous economic self-sufficiency.",
    openJobs: 12,
    employees: "4,000+",
    since: "2023",
    verified: true,
    tags: ["Indigenous-Owned", "Gaming", "Hospitality"],
  },
  {
    id: "stc",
    name: "Saskatoon Tribal Council",
    shortName: "STC",
    type: "employer",
    tier: "premium",
    location: "Saskatoon, SK",
    website: "sktc.sk.ca",
    description:
      "Delivering services across seven member First Nations including health, education, and employment.",
    openJobs: 8,
    employees: "500+",
    since: "2023",
    verified: true,
    tags: ["First Nations", "Social Services", "Health"],
  },
  {
    id: "fnuniv",
    name: "First Nations University of Canada",
    shortName: "FNUniv",
    type: "school",
    tier: "school",
    location: "Regina, SK",
    website: "fnuniv.ca",
    description:
      "First Nations-controlled university with a mandate to enhance the quality of life and preserve the history, language, culture, and artistic heritage of First Nations peoples.",
    openJobs: 3,
    employees: "200+",
    since: "2024",
    verified: true,
    tags: ["Indigenous-Owned", "University", "Education"],
  },
  {
    id: "sask-polytech",
    name: "Saskatchewan Polytechnic",
    shortName: "SP",
    type: "school",
    tier: "school",
    location: "Saskatoon, SK",
    website: "saskpolytech.ca",
    description:
      "Leading polytechnic in Saskatchewan offering diploma and certificate programs with strong Indigenous student support services.",
    openJobs: 3,
    employees: "1,500+",
    since: "2024",
    verified: true,
    tags: ["Education", "Polytechnic", "Training"],
  },
  {
    id: "westland",
    name: "Westland Corp",
    shortName: "WC",
    type: "employer",
    tier: "premium",
    location: "Saskatoon, SK",
    description:
      "Construction and infrastructure services across Saskatchewan.",
    openJobs: 6,
    employees: "300+",
    since: "2025",
    verified: true,
    tags: ["Construction", "Infrastructure"],
  },
  {
    id: "cameco",
    name: "Cameco Corporation",
    shortName: "Cameco",
    type: "employer",
    tier: "premium",
    location: "Saskatoon, SK",
    website: "cameco.com",
    description:
      "One of the world's largest uranium producers with strong commitments to Indigenous partnership agreements and northern employment.",
    openJobs: 9,
    employees: "5,000+",
    since: "2024",
    verified: true,
    tags: ["Mining", "Energy", "Northern Employment"],
  },
  {
    id: "fsin",
    name: "Federation of Sovereign Indigenous Nations",
    shortName: "FSIN",
    type: "employer",
    tier: "premium",
    location: "Saskatoon, SK",
    website: "fsin.com",
    description:
      "The political body representing 74 First Nations in Saskatchewan, advocating for Treaty rights, education, health, and economic development.",
    openJobs: 5,
    employees: "150+",
    since: "2024",
    verified: true,
    tags: ["Governance", "First Nations", "Advocacy"],
  },
];

// ── Posts (jobs, events, scholarships, programs, stories) ──────────────
const posts = [
  // JOBS
  {
    id: "job-executive-director-siga",
    type: "job",
    title: "Executive Director",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    location: "Saskatoon, SK",
    salary: "$95K - $120K",
    jobType: "Full-time",
    deadline: "Mar 15, 2026",
    featured: true,
    closingSoon: true,
    badges: ["Featured", "Closing Soon"],
    description:
      "SIGA is seeking an experienced Executive Director to lead strategic planning, operations oversight, and community engagement initiatives across our seven casino properties in Saskatchewan.",
    responsibilities: [
      "Lead strategic planning and organizational development",
      "Oversee operations across all seven casino properties",
      "Build and maintain relationships with First Nations communities",
      "Manage annual budget of $200M+ and ensure fiscal responsibility",
    ],
    qualifications: [
      "10+ years of senior leadership experience",
      "Experience in gaming, hospitality, or related industries",
      "Strong understanding of Indigenous governance and culture",
      "MBA or equivalent advanced degree preferred",
    ],
    benefits: [
      "Comprehensive health & dental benefits",
      "Pension plan with employer matching",
      "Professional development funding",
      "Cultural leave days",
    ],
    order: 1,
    createdAt: ts,
  },
  {
    id: "job-health-nurse-stc",
    type: "job",
    title: "Community Health Nurse",
    orgId: "stc",
    orgName: "Saskatoon Tribal Council",
    orgShort: "STC",
    location: "Saskatoon, SK",
    jobType: "Full-time",
    salary: "$72K - $88K",
    badges: ["Verified"],
    description:
      "The Saskatoon Tribal Council is looking for a registered nurse to provide community health services across our member First Nations.",
    responsibilities: [
      "Provide primary care nursing services in community settings",
      "Deliver immunization, prenatal, and chronic disease programs",
      "Collaborate with traditional healers and Elders",
    ],
    qualifications: [
      "Registered Nurse (RN) license in Saskatchewan",
      "2+ years of community or public health experience",
      "Cultural sensitivity training or experience with Indigenous communities",
    ],
    benefits: [
      "Northern living allowance",
      "Extended health & dental benefits",
      "Cultural leave days",
    ],
    order: 2,
    createdAt: ts,
  },
  {
    id: "job-youth-coordinator-mltc",
    type: "job",
    title: "Youth Program Coordinator",
    orgName: "Meadow Lake Tribal Council",
    orgShort: "MLTC",
    location: "Meadow Lake, SK",
    jobType: "Contract",
    salary: "$48K - $55K",
    description:
      "Coordinate and deliver youth engagement programs across nine member First Nations. Design culturally relevant programming and mentor young leaders.",
    responsibilities: [
      "Design and deliver youth programming across nine communities",
      "Organize sports, cultural, and leadership events",
      "Recruit and mentor youth volunteers and peer leaders",
    ],
    qualifications: [
      "Diploma or degree in Social Work, Education, or related field",
      "Experience working with Indigenous youth",
      "Knowledge of Cree or Dene language is an asset",
    ],
    benefits: ["Health & dental benefits", "Mileage reimbursement"],
    order: 3,
    createdAt: ts,
  },
  {
    id: "job-surveillance-siga",
    type: "job",
    title: "Surveillance Officer",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    location: "Saskatoon, SK",
    jobType: "Full-time",
    salary: "$45K - $52K",
    description:
      "Monitor casino floor activities using advanced surveillance systems to ensure the integrity and security of gaming operations.",
    order: 4,
    createdAt: ts,
  },
  {
    id: "job-table-games-siga",
    type: "job",
    title: "Table Games Dealer",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    location: "Prince Albert, SK",
    jobType: "Full-time",
    salary: "$38K - $45K + tips",
    description:
      "Deal blackjack, poker, and other table games in a professional and friendly manner. Full paid training is provided.",
    order: 5,
    createdAt: ts,
  },
  {
    id: "job-fb-manager-siga",
    type: "job",
    title: "Food & Beverage Manager",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    location: "Saskatoon, SK",
    jobType: "Full-time",
    salary: "$62K - $75K",
    description:
      "Lead the food and beverage operations at one of SIGA's premier casino properties.",
    order: 6,
    createdAt: ts,
  },
  {
    id: "job-it-support-siga",
    type: "job",
    title: "IT Support Analyst",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    location: "Regina, SK",
    salary: "$55K - $65K",
    jobType: "Full-time",
    description:
      "Provide first and second-level technical support to SIGA staff across all casino properties.",
    order: 7,
    createdAt: ts,
  },
  {
    id: "job-marketing-siga",
    type: "job",
    title: "Marketing Coordinator",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    location: "Saskatoon, SK",
    jobType: "Full-time",
    salary: "$50K - $60K",
    description:
      "Support SIGA's marketing team in developing and executing campaigns that drive guest engagement across all seven casino properties.",
    order: 8,
    createdAt: ts,
  },
  {
    id: "job-instructor-fnuniv",
    type: "job",
    title: "Indigenous Studies Instructor",
    orgId: "fnuniv",
    orgName: "First Nations University of Canada",
    orgShort: "FNUniv",
    location: "Regina, SK",
    jobType: "Full-time",
    salary: "$68K - $82K",
    description:
      "Teach undergraduate Indigenous Studies courses including Treaty education, Indigenous governance, and land-based learning.",
    order: 9,
    createdAt: ts,
  },
  {
    id: "job-recruitment-fnuniv",
    type: "job",
    title: "Student Recruitment Coordinator",
    orgId: "fnuniv",
    orgName: "First Nations University of Canada",
    orgShort: "FNUniv",
    location: "Regina, SK",
    jobType: "Full-time",
    salary: "$45K - $55K",
    description:
      "Travel across Saskatchewan to recruit Indigenous students into FNUniv programs.",
    order: 10,
    createdAt: ts,
  },
  {
    id: "job-mine-operator-cameco",
    type: "job",
    title: "Mine Operations Technician",
    orgId: "cameco",
    orgName: "Cameco Corporation",
    orgShort: "Cameco",
    location: "Northern Saskatchewan",
    jobType: "Full-time",
    salary: "$70K - $90K",
    description:
      "Operate and maintain mining equipment at Cameco's northern uranium operations. Fly-in/fly-out rotation with competitive pay and northern benefits.",
    badges: ["Northern", "Fly-in/Fly-out"],
    order: 11,
    createdAt: ts,
  },
  {
    id: "job-policy-analyst-fsin",
    type: "job",
    title: "Policy Analyst \u2014 Treaty Rights",
    orgId: "fsin",
    orgName: "Federation of Sovereign Indigenous Nations",
    orgShort: "FSIN",
    location: "Saskatoon, SK",
    jobType: "Full-time",
    salary: "$65K - $78K",
    description:
      "Research and analyze policies affecting Treaty rights in Saskatchewan. Prepare briefings for Chiefs and support advocacy at provincial and federal levels.",
    order: 12,
    createdAt: ts,
  },

  // EVENTS
  {
    id: "event-batoche",
    type: "event",
    title: "Back to Batoche Days",
    location: "Batoche National Historic Site, SK",
    dates: "Jul 18-20",
    price: "Free",
    eventType: "Cultural Celebration",
    organizer: "M\u00e9tis Nation \u2014 Saskatchewan",
    description:
      "An annual gathering that brings together thousands of M\u00e9tis and Indigenous peoples to celebrate their rich heritage, culture, and history at the Batoche National Historic Site.",
    highlights: [
      "Traditional jigging and fiddle competitions",
      "Cultural workshops and language sessions",
      "Traditional food and craft vendors",
      "Youth programming and mentorship",
      "Community feast and round dance",
    ],
    order: 13,
    createdAt: ts,
  },
  {
    id: "event-career-fair",
    type: "event",
    title: "Treaty 6 Career Fair",
    location: "Saskatoon, SK",
    dates: "Aug 5",
    price: "Free",
    eventType: "Career Fair",
    organizer: "Treaty 6 Education Council",
    description:
      "Connect with over 30 employers actively hiring Indigenous talent at Saskatchewan's largest Treaty 6 career fair.",
    highlights: [
      "30+ employers with active job openings",
      "On-the-spot interviews and hiring",
      "Free professional resume reviews",
      "Youth career exploration zone",
    ],
    order: 14,
    createdAt: ts,
  },
  {
    id: "event-round-dance",
    type: "event",
    title: "Round Dance",
    location: "Prince Albert, SK",
    dates: "Mar 22",
    price: "Free",
    eventType: "Round Dance",
    organizer: "Prince Albert Grand Council",
    description:
      "A traditional Cree round dance ceremony celebrating community, healing, and togetherness. Feast at 5:00 PM, round dance begins at 7:00 PM.",
    order: 15,
    createdAt: ts,
  },
  {
    id: "event-hockey-tournament",
    type: "event",
    title: "First Nations Hockey Tournament",
    location: "North Battleford, SK",
    dates: "Apr 11-13",
    price: "$250/team",
    eventType: "Hockey",
    organizer: "Battlefords Agency Tribal Chiefs",
    description:
      "Annual First Nations hockey tournament featuring teams from across Saskatchewan. Divisions for youth, adult, and old-timers.",
    highlights: [
      "Youth, adult, and old-timers divisions",
      "Prize money for top finishers",
      "Skills competition",
      "Community social on Saturday night",
    ],
    order: 16,
    createdAt: ts,
  },
  {
    id: "event-powwow-fpa",
    type: "event",
    title: "First Peoples Assembly Pow Wow",
    location: "Saskatoon, SK",
    dates: "Jun 14-15",
    price: "Free",
    eventType: "Pow Wow",
    organizer: "First Peoples Assembly",
    description:
      "A celebration of Indigenous culture featuring grand entries, traditional and contemporary dance categories, drum groups, and vendor market.",
    highlights: [
      "Grand entry ceremonies",
      "Traditional, fancy, jingle, and grass dance",
      "Drum group competition",
      "Arts and crafts market",
      "Traditional foods",
    ],
    order: 17,
    createdAt: ts,
  },

  // SCHOLARSHIPS
  {
    id: "scholarship-indspire",
    type: "scholarship",
    title: "Indspire Building Brighter Futures Bursary",
    orgName: "Indspire",
    orgShort: "Indspire",
    amount: "Up to $10,000",
    deadline: "May 1, 2026",
    eligibility: "First Nations, Inuit, or M\u00e9tis students in Canada",
    description:
      "Indspire's flagship bursary program supports Indigenous students pursuing post-secondary education. Open to all fields of study at accredited institutions.",
    badges: ["National", "All Fields"],
    order: 18,
    createdAt: ts,
  },
  {
    id: "scholarship-siga-bursary",
    type: "scholarship",
    title: "SIGA Community Scholarship",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    amount: "$3,000",
    deadline: "Jun 30, 2026",
    eligibility: "Indigenous students in Saskatchewan pursuing business, hospitality, or technology programs",
    description:
      "SIGA awards annual scholarships to Indigenous students pursuing careers aligned with gaming and hospitality industries.",
    badges: ["Saskatchewan"],
    order: 19,
    createdAt: ts,
  },
  {
    id: "scholarship-cameco-northern",
    type: "scholarship",
    title: "Cameco Northern Scholarship",
    orgId: "cameco",
    orgName: "Cameco Corporation",
    orgShort: "Cameco",
    amount: "$5,000",
    deadline: "Apr 15, 2026",
    eligibility: "Indigenous students from northern Saskatchewan communities",
    description:
      "Supporting northern Indigenous students pursuing education in science, engineering, trades, or environmental studies.",
    badges: ["Northern SK", "STEM"],
    order: 20,
    createdAt: ts,
  },
  {
    id: "scholarship-fsin-education",
    type: "scholarship",
    title: "FSIN Education Award",
    orgId: "fsin",
    orgName: "Federation of Sovereign Indigenous Nations",
    orgShort: "FSIN",
    amount: "$2,500",
    deadline: "Sep 1, 2026",
    eligibility: "First Nations citizens in Saskatchewan entering or continuing post-secondary",
    description:
      "Annual education awards recognizing academic achievement and community involvement among Saskatchewan First Nations students.",
    badges: ["Saskatchewan", "First Nations"],
    order: 21,
    createdAt: ts,
  },
  {
    id: "scholarship-nstq-trades",
    type: "scholarship",
    title: "Northern Trades & Technology Bursary",
    amount: "$4,000",
    orgName: "Northern Skills Training Qtr",
    orgShort: "NSTQ",
    deadline: "Jul 15, 2026",
    eligibility: "Indigenous students enrolled in trades or technology programs in Saskatchewan",
    description:
      "Supports Indigenous students pursuing apprenticeships and technical certifications in high-demand trades.",
    badges: ["Trades", "Technology"],
    order: 22,
    createdAt: ts,
  },

  // PROGRAMS
  {
    id: "program-indigenous-business-fnuniv",
    type: "program",
    title: "Indigenous Business Administration",
    orgId: "fnuniv",
    orgName: "First Nations University of Canada",
    orgShort: "FNUniv",
    location: "Regina, SK",
    duration: "4 Years",
    credential: "Bachelor's Degree",
    badges: ["Education Partner"],
    description:
      "A comprehensive business degree grounded in Indigenous values and worldviews.",
    order: 23,
    createdAt: ts,
  },
  {
    id: "program-cna-sp",
    type: "program",
    title: "Continuing Care Assistant",
    orgId: "sask-polytech",
    orgName: "Saskatchewan Polytechnic",
    orgShort: "SP",
    location: "Saskatoon, SK",
    duration: "8 Months",
    credential: "Certificate",
    badges: ["Education Partner", "High Demand"],
    description:
      "Train to provide personal care to people in long-term care facilities, home care, and acute care settings.",
    order: 24,
    createdAt: ts,
  },
  {
    id: "program-welding-sp",
    type: "program",
    title: "Welding Certificate",
    orgId: "sask-polytech",
    orgName: "Saskatchewan Polytechnic",
    orgShort: "SP",
    location: "Prince Albert, SK",
    duration: "6 Months",
    credential: "Certificate",
    badges: ["Trades"],
    description:
      "Hands-on welding training preparing students for apprenticeship and careers in construction, mining, and manufacturing.",
    order: 25,
    createdAt: ts,
  },

  // STORIES
  {
    id: "story-sarah",
    type: "story",
    title: "Sarah Whitebear",
    community: "Muskoday First Nation",
    quote: "Every step I took was for my community.",
    description:
      "Sarah went from community volunteer to SIGA's youngest regional manager, earning her business degree through FNUniv while working full-time.",
    order: 26,
    createdAt: ts,
  },
  {
    id: "story-marcus",
    type: "story",
    title: "Marcus Bear",
    community: "Onion Lake Cree Nation",
    quote: "The land teaches you everything you need to know about leadership.",
    description:
      "Marcus left a corporate career in Calgary to return home and start a land-based youth program that has since expanded to four communities.",
    order: 27,
    createdAt: ts,
  },
  {
    id: "story-jennifer",
    type: "story",
    title: "Jennifer Iron",
    community: "Cowessess First Nation",
    quote: "I wanted to see myself in the healthcare system I was part of.",
    description:
      "Jennifer became Saskatchewan's first Indigenous nurse practitioner in her region, now mentoring the next generation through STC's health programs.",
    order: 28,
    createdAt: ts,
  },

  // SPOTLIGHT
  {
    id: "spotlight-siga",
    type: "spotlight",
    title: "Saskatchewan Indian Gaming Authority",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    description:
      "Leading Indigenous employer in Saskatchewan with 12 open positions across 7 casino properties.",
    order: 29,
    createdAt: ts,
  },
];

// ── Seed function ──────────────────────────────────────────────────────
async function seed() {
  console.log("Seeding organizations...");
  for (const org of orgs) {
    const { id, ...data } = org;
    await setDoc("organizations", id, data);
    process.stdout.write(".");
  }
  console.log(` ${orgs.length} organizations`);

  console.log("Seeding posts...");
  for (const post of posts) {
    const { id, ...data } = post;
    await setDoc("posts", id, data);
    process.stdout.write(".");
  }
  console.log(` ${posts.length} posts`);

  // Seed notifications for the admin user
  const adminUid = "ZDOiBitFKDbDD286ZGK3YsWRxfv1";
  console.log("Seeding notifications for admin...");
  const notifs = [
    {
      userId: adminUid,
      type: "welcome",
      title: "Welcome to IOPPS!",
      body: "Your account is set up. Complete your profile to get personalized recommendations.",
      link: "/profile",
      read: false,
      createdAt: ts,
    },
    {
      userId: adminUid,
      type: "job_match",
      title: "New job match: Executive Director",
      body: "SIGA posted an Executive Director position in Saskatoon.",
      link: "/jobs/job-executive-director-siga",
      read: false,
      createdAt: ts,
    },
    {
      userId: adminUid,
      type: "event_reminder",
      title: "Back to Batoche Days is coming up",
      body: "Don\u2019t miss the annual cultural celebration \u2014 Jul 18-20 at Batoche National Historic Site.",
      link: "/events/event-batoche",
      read: false,
      createdAt: ts,
    },
  ];
  for (const n of notifs) {
    await addDoc("notifications", n);
    process.stdout.write(".");
  }
  console.log(` ${notifs.length} notifications`);

  console.log("\nDone! Database seeded successfully.");
  console.log(`  ${orgs.length} organizations`);
  console.log(`  ${posts.length} posts (${posts.filter(p => p.type === "job").length} jobs, ${posts.filter(p => p.type === "event").length} events, ${posts.filter(p => p.type === "scholarship").length} scholarships, ${posts.filter(p => p.type === "program").length} programs, ${posts.filter(p => p.type === "story").length} stories, ${posts.filter(p => p.type === "spotlight").length} spotlights)`);
  console.log(`  ${notifs.length} notifications`);
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
