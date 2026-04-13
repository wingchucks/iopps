import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const seedTag = "school-showcase-2026-04";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex < 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value.replace(/\\n/g, "\n");
  }
}

function stripWrappingQuotes(value) {
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
  return value;
}

function normalizePrivateKey(value) {
  return stripWrappingQuotes(value).replace(/\\n/g, "\n");
}

function initAdmin() {
  loadEnvFile(path.join(rootDir, ".env.local"));
  loadEnvFile(path.join(rootDir, ".env.vercel.production"));

  const base64Credential = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  let projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY ? normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY) : undefined;

  if (base64Credential) {
    const decoded = Buffer.from(stripWrappingQuotes(base64Credential), "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    projectId = parsed.projectId || parsed.project_id || projectId;
    clientEmail = parsed.clientEmail || parsed.client_email || clientEmail;
    privateKey = parsed.privateKey || parsed.private_key
      ? normalizePrivateKey(parsed.privateKey || parsed.private_key)
      : privateKey;
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin credentials. Expected FIREBASE_SERVICE_ACCOUNT_BASE64 or FIREBASE_* env vars.");
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return admin.firestore();
}

function faviconFor(website) {
  return `https://www.google.com/s2/favicons?sz=256&domain_url=${encodeURIComponent(website)}`;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const schools = [
  {
    slug: "saskatchewan-polytechnic",
    name: "Saskatchewan Polytechnic",
    shortName: "Sask Polytech",
    website: "https://saskpolytech.ca",
    sourceUrls: [
      "https://saskpolytech.ca/student-services/support/indigenous/index.aspx",
      "https://saskpolytech.ca/programs-and-courses/resources/documents/2023-24-calendar.pdf",
    ],
    programsHubUrl: "https://saskpolytech.ca/programs-and-courses/",
    careersUrl: "https://saskpolytech.ca/student-services/support/indigenous/index.aspx",
    location: { city: "Saskatoon", province: "Saskatchewan" },
    institutionType: "Polytechnic",
    description:
      "Saskatchewan Polytechnic combines applied learning with Indigenous student services, transition support, and career-connected programs across Saskatchewan, anchored by a strong Saskatoon presence.",
    areasOfStudy: ["Nursing", "Technology", "Business", "Trades", "Community Services"],
    services: [
      "Indigenous Student Services",
      "Student Advisors",
      "Transition Support",
      "Scholarships and Bursaries",
      "Cultural Supports",
    ],
    campuses: [
      { name: "Saskatoon Campus", location: "Saskatoon, Saskatchewan", type: "Primary Campus" },
      { name: "Regina Campus", location: "Regina, Saskatchewan" },
      { name: "Moose Jaw Campus", location: "Moose Jaw, Saskatchewan" },
      { name: "Prince Albert Campus", location: "Prince Albert, Saskatchewan" },
    ],
    previewHighlights: [
      "Indigenous student services and advising are built into the learner experience.",
      "Applied programs connect students to health, technical, business, and community careers.",
      "Indigenous awards, scholarships, and emergency bursaries are part of the support mix.",
    ],
    showcaseRank: 1,
    programs: [
      {
        title: "Practical Nursing",
        credential: "Diploma",
        description: "Health-focused diploma pathway connected to patient care and frontline nursing practice.",
        programUrl: "https://saskpolytech.ca/programs-and-courses/resources/documents/2023-24-calendar.pdf",
        duration: "2 years",
      },
      {
        title: "Orientation to Nursing in Canada for Internationally Educated Nurses",
        credential: "Applied Certificate",
        description: "Bridging pathway supporting internationally educated nurses preparing for practice in Canada.",
        programUrl: "https://saskpolytech.ca/programs-and-courses/resources/documents/2023-24-calendar.pdf",
      },
    ],
    scholarships: [
      {
        title: "Indigenous Student Awards, Scholarships, and Emergency Bursaries",
        description: "Public scholarship and bursary supports referenced through Saskatchewan Polytechnic's Indigenous student services.",
        applicationUrl: "https://saskpolytech.ca/student-services/support/indigenous/index.aspx",
        educationLevel: "Post-secondary",
        indigenousSpecific: "Yes",
      },
    ],
  },
  {
    slug: "norquest-college",
    name: "NorQuest College",
    shortName: "NorQuest",
    website: "https://www.norquest.ca",
    sourceUrls: [
      "https://www.norquest.ca/student-services/indigenous-student-services/",
      "https://www.norquest.ca/programs-and-courses/",
    ],
    programsHubUrl: "https://www.norquest.ca/programs-and-courses/",
    careersUrl: "https://www.norquest.ca/student-services/indigenous-student-services/",
    applyUrl: "https://www.norquest.ca/apply-and-register/",
    location: { city: "Edmonton", province: "Alberta" },
    institutionType: "College",
    description:
      "NorQuest College brings Indigenous student support together with practical, workforce-connected programs for learners in Edmonton and across Alberta.",
    areasOfStudy: ["Healthcare", "Community Studies", "Human Services", "Business", "Upgrading"],
    services: [
      "Indigenous Student Services",
      "Student Advising",
      "Learner Support",
      "Community Pathways",
      "Applied Career Preparation",
    ],
    campuses: [
      { name: "Edmonton Downtown Campus", location: "Edmonton, Alberta", type: "Primary Campus" },
      { name: "Wetaskiwin Campus", location: "Wetaskiwin, Alberta" },
    ],
    previewHighlights: [
      "Indigenous Student Services gives learners a visible starting point for support.",
      "Applied college programming is designed around direct pathways into work and community service.",
      "NorQuest's model supports adult learners, community learners, and practical career transitions.",
    ],
    showcaseRank: 2,
    programs: [
      {
        title: "Community Studies",
        description: "Community-focused applied learning preparing students for support roles across social and community services.",
        programUrl: "https://www.norquest.ca/programs-and-courses/",
      },
      {
        title: "Practical Nurse",
        description: "Nursing-focused applied program aligned with healthcare employment pathways.",
        programUrl: "https://www.norquest.ca/programs-and-courses/",
      },
    ],
    scholarships: [],
  },
  {
    slug: "rrc-polytech",
    name: "RRC Polytech",
    shortName: "RRC",
    website: "https://www.rrc.ca",
    sourceUrls: [
      "https://www.rrc.ca/indigenous/",
      "https://catalogue.rrc.ca/files/File/catalogue/BAAtAGlance1920.pdf",
      "https://www.rrc.ca/wp-content/uploads/sites/1/2023/10/RRC_Polytech-Form-Enrolment_Services-ECE_Workplace_Employment_Confirmation-October_2023-v2.pdf",
    ],
    programsHubUrl: "https://www.rrc.ca/explore/",
    careersUrl: "https://www.rrc.ca/indigenous/",
    applyUrl: "https://www.rrc.ca/future-students/apply/",
    location: { city: "Winnipeg", province: "Manitoba" },
    institutionType: "Polytechnic",
    description:
      "RRC Polytech combines Indigenous student supports, applied learning, and employer-connected programs that align with Manitoba workforce opportunities.",
    areasOfStudy: ["Business", "Early Childhood Education", "Technology", "Skilled Trades", "Community Services"],
    services: [
      "Indigenous Student Support",
      "Student Recruitment and Advising",
      "Mentorship and Community Support",
      "Career Preparation",
      "Applied Learning",
    ],
    campuses: [
      { name: "Notre Dame Campus", location: "Winnipeg, Manitoba", type: "Primary Campus" },
      { name: "Exchange District Campus", location: "Winnipeg, Manitoba" },
      { name: "Peguis - Fisher River Campus", location: "Peguis First Nation and Fisher River Cree Nation, Manitoba" },
    ],
    previewHighlights: [
      "Indigenous Strategy and student support are visible parts of the polytechnic experience.",
      "Programs blend classroom learning with applied, employment-ready outcomes.",
      "RRC Polytech is well positioned to connect students with Manitoba employers already active on IOPPS.",
    ],
    showcaseRank: 3,
    programs: [
      {
        title: "Business Administration",
        credential: "Diploma",
        description: "Applied business program preparing learners for management, operations, and organizational roles.",
        programUrl: "https://www.rrc.ca/explore/",
      },
      {
        title: "Early Childhood Education Workplace",
        description: "Workplace-connected pathway focused on early learning and child care practice.",
        programUrl: "https://www.rrc.ca/explore/",
      },
    ],
    scholarships: [],
  },
  {
    slug: "vancouver-island-university",
    name: "Vancouver Island University",
    shortName: "VIU",
    website: "https://www.viu.ca",
    sourceUrls: [
      "https://www.viu.ca/programs/indigenous",
      "https://www.viu.ca/apply-viu",
    ],
    programsHubUrl: "https://www.viu.ca/programs",
    careersUrl: "https://www.viu.ca/programs/indigenous",
    applyUrl: "https://www.viu.ca/apply-viu",
    location: { city: "Nanaimo", province: "British Columbia" },
    institutionType: "University",
    description:
      "Vancouver Island University pairs Indigenous education and engagement with culturally grounded learning pathways and coastal-campus student support.",
    areasOfStudy: ["Indigenous Studies", "University Bridging", "Child and Youth Care", "Community Support", "Health Pathways"],
    services: [
      "Indigenous Education and Engagement",
      "Elders in Residence",
      "Student Support and Advising",
      "Cultural Connection",
      "Reserved-Seat Pathways",
    ],
    campuses: [
      { name: "Nanaimo Campus", location: "Nanaimo, British Columbia", type: "Primary Campus" },
      { name: "Cowichan Campus", location: "Duncan, British Columbia" },
      { name: "tiwšɛmawtxʷ Campus", location: "Powell River, British Columbia" },
    ],
    previewHighlights: [
      "Indigenous Education and Engagement gives learners a clear home base for support.",
      "Aboriginal University Bridging and Indigenous/Xwulmuxw Studies create culturally grounded pathways into degree learning.",
      "VIU highlights Indigenous learner access and community-connected education across coastal campuses.",
    ],
    showcaseRank: 4,
    programs: [
      {
        title: "Aboriginal University Bridging Program",
        description: "University bridging pathway helping Indigenous learners prepare for degree-level study.",
        programUrl: "https://www.viu.ca/programs/indigenous",
      },
      {
        title: "Indigenous/Xwulmuxw Studies",
        description: "Indigenous-focused study of language, culture, history, and community knowledge.",
        programUrl: "https://www.viu.ca/programs/indigenous",
      },
      {
        title: "Child and Youth Care First Nations Cohort",
        description: "Cohort-based pathway supporting community-focused practice with children, youth, and families.",
        programUrl: "https://www.viu.ca/programs/indigenous",
      },
    ],
    scholarships: [],
  },
  {
    slug: "algoma-university",
    name: "Algoma University",
    shortName: "Algoma U",
    website: "https://algomau.ca",
    sourceUrls: [
      "https://algomau.ca/academics/programs/anishinaabe-studies/",
      "https://apply.algomau.ca",
    ],
    programsHubUrl: "https://algomau.ca/academics/programs/",
    careersUrl: "https://algomau.ca/academics/programs/anishinaabe-studies/",
    applyUrl: "https://apply.algomau.ca",
    location: { city: "Sault Ste. Marie", province: "Ontario" },
    institutionType: "University",
    description:
      "Algoma University's special mission is rooted in cross-cultural learning between Indigenous communities and other communities, with distinctive Anishinaabe programming and partnership.",
    areasOfStudy: ["Anishinaabe Studies", "Language Revitalization", "Indigenous Learning", "Social Development", "Cross-Cultural Learning"],
    services: [
      "Anishinaabe Student Supports",
      "Academic Advising",
      "Cross-Cultural Learning",
      "Partnership Programming",
      "Degree Pathways",
    ],
    campuses: [
      { name: "Sault Ste. Marie Campus", location: "Sault Ste. Marie, Ontario", type: "Primary Campus" },
      { name: "Brampton Campus", location: "Brampton, Ontario" },
      { name: "Timmins Campus", location: "Timmins, Ontario" },
    ],
    previewHighlights: [
      "Algoma's special mission is explicitly grounded in cross-cultural learning with Indigenous communities.",
      "Shingwauk Kinoomaage Gamig partnership makes the Anishinaabe Studies pathway distinct in Canada.",
      "Anishinaabe-focused programs create a credible Indigenous-centered university presence in the directory.",
    ],
    showcaseRank: 5,
    programs: [
      {
        title: "Bachelor of Arts in Anishinaabe Studies",
        credential: "Bachelor's Degree",
        description: "Degree pathway grounded in Anishinaabe knowledge, history, and community-based learning.",
        programUrl: "https://algomau.ca/academics/programs/anishinaabe-studies/",
      },
      {
        title: "Bachelor of Arts in Anishinaabemowin",
        credential: "Bachelor's Degree",
        description: "Language-focused degree pathway connected to Anishinaabemowin revitalization.",
        programUrl: "https://algomau.ca/academics/programs/anishinaabe-studies/",
      },
      {
        title: "Interdisciplinary Aboriginal Learning Certificate",
        credential: "Certificate",
        description: "Interdisciplinary certificate connected to Indigenous learning and cross-cultural study.",
        programUrl: "https://algomau.ca/academics/programs/anishinaabe-studies/",
      },
    ],
    scholarships: [],
  },
  {
    slug: "college-kiuna",
    name: "Collège Kiuna",
    shortName: "Kiuna",
    website: "https://kiuna-college.com",
    sourceUrls: [
      "https://kiuna-college.com/fra/sciences-nature/",
      "https://kiuna-college.com",
    ],
    programsHubUrl: "https://kiuna-college.com/fra/sciences-nature/",
    careersUrl: "https://kiuna-college.com/fra/sciences-nature/",
    location: { city: "Odanak", province: "Quebec" },
    institutionType: "Indigenous Institute",
    description:
      "Collège Kiuna is an Indigenous-led college environment built for First Nations learners, with programming that centers language, culture, and community while keeping strong academic pathways open.",
    areasOfStudy: ["Sciences", "Arts and Communication", "Languages", "Humanities", "Cultural Transmission"],
    services: [
      "Culturally Grounded Learning",
      "Language and Cultural Supports",
      "Community Environment",
      "Land-Based Activities",
      "Pathways to University",
    ],
    campuses: [
      { name: "Odanak Campus", location: "Odanak, Quebec", type: "Primary Campus" },
    ],
    previewHighlights: [
      "Kiuna is Indigenous-led and intentionally built around First Nations learners.",
      "Programs combine academic preparation with First Nations and Inuit knowledge systems.",
      "Culture, language, and on-the-land learning are part of the student experience.",
    ],
    showcaseRank: 6,
    programs: [
      {
        title: "DEC – Sciences de la nature – Profil Premières Nations et Inuit",
        credential: "DEC",
        description: "Science pathway built for First Nations and Inuit students preparing for university study.",
        programUrl: "https://kiuna-college.com/fra/sciences-nature/",
      },
      {
        title: "DEC – Arts, lettres et communication – Premières Nations Option Cinéma autochtone",
        credential: "DEC",
        description: "Arts and communications pathway rooted in Indigenous storytelling and media expression.",
        programUrl: "https://kiuna-college.com/fra/sciences-nature/",
      },
      {
        title: "AEC – Transmission linguistique et culturelle",
        credential: "AEC",
        description: "Continuing education pathway focused on language and cultural transmission.",
        programUrl: "https://kiuna-college.com/fra/sciences-nature/",
      },
    ],
    scholarships: [],
  },
  {
    slug: "new-brunswick-community-college",
    name: "New Brunswick Community College",
    shortName: "NBCC",
    website: "https://nbcc.ca",
    sourceUrls: [
      "https://nbcc.ca/indigenous/student-support",
      "https://nbcc.ca/programs-courses",
    ],
    programsHubUrl: "https://nbcc.ca/programs-courses",
    careersUrl: "https://nbcc.ca/indigenous/student-support",
    location: { city: "Moncton", province: "New Brunswick" },
    institutionType: "College",
    description:
      "NBCC connects practical, employment-focused training with Indigenous student support across New Brunswick's college network.",
    areasOfStudy: ["Nursing", "Early Childhood Education", "Trades", "Technology", "Community Services"],
    services: [
      "Indigenous Student Support",
      "Student Success Advising",
      "Career-Focused Training",
      "Community-Based Learning",
      "College Navigation Support",
    ],
    campuses: [
      { name: "Moncton Campus", location: "Moncton, New Brunswick", type: "Primary Campus" },
      { name: "Saint John Campus", location: "Saint John, New Brunswick" },
      { name: "Fredericton Campus", location: "Fredericton, New Brunswick" },
    ],
    previewHighlights: [
      "NBCC frames learner support across the traditional territories of Mi'kmaq, Wolastoqey, and Peskotomuhkati peoples.",
      "Practical Nurse and Early Childhood Education create direct workforce pathways for students.",
      "The college model is well suited to students looking for community-connected, applied training.",
    ],
    showcaseRank: 7,
    programs: [
      {
        title: "Practical Nurse",
        credential: "Diploma",
        description: "Applied healthcare pathway preparing learners for nursing roles and clinical settings.",
        programUrl: "https://nbcc.ca/programs-courses",
      },
      {
        title: "Early Childhood Education",
        credential: "Diploma",
        description: "Career-focused pathway supporting work in early learning and child care settings.",
        programUrl: "https://nbcc.ca/programs-courses",
      },
    ],
    scholarships: [],
  },
  {
    slug: "nova-scotia-community-college",
    name: "Nova Scotia Community College",
    shortName: "NSCC",
    website: "https://www.nscc.ca",
    sourceUrls: [
      "https://www.nscc.ca/student-experience/cultural-supports/index.asp",
      "https://www.nscc.ca/programs-and-courses/",
      "https://www.nscc.ca/foundation/docs/publications/2024-25-nscc-foundation-alumni-relations-annual-report.pdf",
    ],
    programsHubUrl: "https://www.nscc.ca/programs-and-courses/",
    careersUrl: "https://www.nscc.ca/student-experience/cultural-supports/index.asp",
    applyUrl: "https://www.nscc.ca/admissions/apply/",
    location: { city: "Halifax", province: "Nova Scotia" },
    institutionType: "College",
    description:
      "NSCC pairs province-wide applied training with Mi'kmaw and Indigenous cultural supports, entrepreneurship programming, and student-success services.",
    areasOfStudy: ["Practical Nursing", "Information Technology", "Entrepreneurship", "Skilled Trades", "Community Services"],
    services: [
      "Mi'kmaw Cultural Support Mentors",
      "Indigenous Student Support Program",
      "Student Advising",
      "Entrepreneurship Support",
      "Applied Career Preparation",
    ],
    campuses: [
      { name: "Ivany Campus", location: "Dartmouth, Nova Scotia", type: "Primary Campus" },
      { name: "Institute of Technology Campus", location: "Halifax, Nova Scotia" },
      { name: "Kingstec Campus", location: "Kentville, Nova Scotia" },
    ],
    previewHighlights: [
      "Mi'kmaw Cultural Support Mentors and the Indigenous Student Support Program are visible student-facing supports.",
      "Programs like Practical Nursing and IT pathways align with regional workforce demand.",
      "NSCC combines community-based support with applied, career-ready education across the province.",
    ],
    showcaseRank: 8,
    programs: [
      {
        title: "Practical Nursing",
        credential: "Diploma",
        description: "Applied nursing pathway preparing students for clinical care and healthcare teamwork.",
        programUrl: "https://www.nscc.ca/programs-and-courses/",
      },
      {
        title: "IT Programming",
        credential: "Diploma",
        description: "Technology pathway focused on software development, programming, and digital problem-solving.",
        programUrl: "https://www.nscc.ca/programs-and-courses/",
      },
    ],
    scholarships: [],
  },
  {
    slug: "holland-college",
    name: "Holland College",
    shortName: "Holland",
    website: "https://www.hollandcollege.com",
    sourceUrls: [
      "https://www.hollandcollege.com/News/2025/new-advisory-committee-centres-indigenous-voices.html",
      "https://www.hollandcollege.com/programs/",
    ],
    programsHubUrl: "https://www.hollandcollege.com/programs/",
    careersUrl: "https://www.hollandcollege.com/News/2025/new-advisory-committee-centres-indigenous-voices.html",
    location: { city: "Charlottetown", province: "Prince Edward Island" },
    institutionType: "College",
    description:
      "Holland College combines applied learning and student-ready programs with a growing Indigenous advisory and engagement structure on Prince Edward Island.",
    areasOfStudy: ["Culinary Arts", "Business", "Human Resources", "Hospitality", "Applied Skills"],
    services: [
      "Applied Learning",
      "Student Advising",
      "Work Placement",
      "Cultural and Community Engagement",
      "Career Preparation",
    ],
    campuses: [
      { name: "Charlottetown Centre", location: "Charlottetown, Prince Edward Island", type: "Primary Campus" },
      { name: "Tourism and Culinary Centre", location: "Charlottetown, Prince Edward Island" },
      { name: "Summerside Waterfront Campus", location: "Summerside, Prince Edward Island" },
    ],
    previewHighlights: [
      "An Indigenous Advisory Committee creates visible Indigenous leadership and accountability.",
      "Culinary and business programs reflect Holland College's applied, employment-ready model.",
      "The college can use IOPPS to connect school learning with employers and community partners.",
    ],
    showcaseRank: 9,
    programs: [
      {
        title: "Culinary Arts",
        credential: "Diploma",
        description: "Hands-on culinary training connected to hospitality, kitchens, and food-service careers.",
        programUrl: "https://www.hollandcollege.com/programs/",
      },
      {
        title: "Human Resource Management",
        credential: "Diploma",
        description: "Business pathway supporting leadership, workforce planning, and people operations roles.",
        programUrl: "https://www.hollandcollege.com/programs/",
      },
    ],
    scholarships: [],
  },
  {
    slug: "memorial-university-labrador-campus",
    name: "Memorial University Labrador Campus",
    shortName: "Labrador Campus",
    website: "https://www.mun.ca/labrador-campus/",
    sourceUrls: [
      "https://www.mun.ca/university-calendar/labrador-campus/labrador-campus/3/",
      "https://gazette.mun.ca/teaching-and-learning/on-the-basis-of-place/",
    ],
    programsHubUrl: "https://www.mun.ca/labrador-campus/",
    careersUrl: "https://www.mun.ca/labrador-campus/",
    applyUrl: "https://www.mun.ca/undergrad/apply/",
    location: { city: "Happy Valley-Goose Bay", province: "Newfoundland and Labrador" },
    institutionType: "University Campus",
    description:
      "Memorial's Labrador Campus is a Northern and Indigenous-centered academic environment linking Labrador-based learning, Arctic and Subarctic study, and community partnership.",
    areasOfStudy: ["Arctic and Subarctic Studies", "Northern Research", "Community Learning", "Interdisciplinary Studies", "Labrador Futures"],
    services: [
      "Northern and Indigenous Research",
      "Community-Based Learning",
      "Student Support",
      "Interdisciplinary Study",
      "Labrador-Focused Programming",
    ],
    campuses: [
      { name: "Labrador Campus", location: "Happy Valley-Goose Bay, Newfoundland and Labrador", type: "Primary Campus" },
    ],
    previewHighlights: [
      "The campus is home to the School of Arctic and Subarctic Studies.",
      "Programming is grounded in Labrador and the homelands of Inuit, Innu, and NunatuKavut peoples.",
      "Community-based Northern research makes the campus distinct within the national school showcase.",
    ],
    showcaseRank: 10,
    programs: [
      {
        title: "Bachelor of Arctic and Subarctic Interdisciplinary Studies (BASIS)",
        credential: "Bachelor's Degree",
        description: "Interdisciplinary Northern studies pathway grounded in place, community, and Arctic/Subarctic learning.",
        programUrl: "https://www.mun.ca/labrador-campus/",
      },
      {
        title: "Arctic and Subarctic Futures",
        credential: "Graduate Pathway",
        description: "Advanced Northern studies pathway focused on Arctic and Subarctic issues, communities, and futures.",
        programUrl: "https://www.mun.ca/labrador-campus/",
      },
    ],
    scholarships: [],
  },
];

function buildOrganizationDoc(school) {
  return {
    name: school.name,
    slug: school.slug,
    shortName: school.shortName,
    type: "school",
    ownerType: "school",
    institutionType: school.institutionType,
    description: school.description,
    website: school.website,
    logoUrl: faviconFor(school.website),
    location: school.location,
    services: school.services,
    campuses: school.campuses,
    campusCount: school.campuses.length,
    areasOfStudy: school.areasOfStudy,
    keyStudyAreas: school.areasOfStudy.slice(0, 4),
    previewHighlights: school.previewHighlights,
    careersUrl: school.careersUrl,
    ...(school.applyUrl ? { applyUrl: school.applyUrl } : {}),
    profileMode: "claimable-preview",
    claimable: true,
    claimLabel: "Claim or update this school",
    claimCtaHref: `/org/signup?orgType=school&claim=${school.slug}`,
    sourceUrls: school.sourceUrls,
    seedSource: "public-official",
    seedTag,
    showcaseRank: school.showcaseRank,
    isPublished: true,
    publicationStatus: "PUBLISHED",
    directoryVisible: true,
    isDirectoryVisible: true,
    publicVisibility: "public",
    status: "approved",
    verified: false,
    onboardingComplete: false,
    openJobs: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

function buildProgramDocs(school) {
  return school.programs.map((program, index) => {
    const slug = `${school.slug}-${slugify(program.title)}`;
    return {
      id: `program-${slug}`,
      data: {
        type: "program",
        title: program.title,
        slug,
        status: "active",
        orgId: school.slug,
        orgName: school.name,
        orgShort: school.shortName,
        institutionName: school.name,
        description: program.description,
        ...(program.credential ? { credential: program.credential } : {}),
        ...(program.duration ? { duration: program.duration } : {}),
        ...(program.format ? { format: program.format } : {}),
        location: `${school.location.city}, ${school.location.province}`,
        programUrl: program.programUrl || school.programsHubUrl || school.website,
        badges: school.areasOfStudy.slice(0, 3),
        source: program.programUrl || school.sourceUrls[0],
        seedSource: "public-official",
        seedTag,
        order: school.showcaseRank * 100 + index,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    };
  });
}

function buildScholarshipDocs(school) {
  return school.scholarships.map((scholarship, index) => {
    const slug = `${school.slug}-${slugify(scholarship.title)}`;
    return {
      id: slug,
      data: {
        title: scholarship.title,
        slug,
        description: scholarship.description,
        orgId: school.slug,
        orgName: school.name,
        organization: school.name,
        applicationUrl: scholarship.applicationUrl,
        educationLevel: scholarship.educationLevel,
        indigenousSpecific: scholarship.indigenousSpecific,
        location: `${school.location.city}, ${school.location.province}`,
        status: "active",
        active: true,
        featured: false,
        source: scholarship.applicationUrl || school.sourceUrls[0],
        seedSource: "public-official",
        seedTag,
        order: school.showcaseRank * 100 + index,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    };
  });
}

async function pruneSeededDocs(db, collectionName, expectedIds) {
  const snap = await db.collection(collectionName).where("seedTag", "==", seedTag).get();
  if (snap.empty) return;

  let batch = db.batch();
  let count = 0;

  for (const doc of snap.docs) {
    if (expectedIds.has(doc.id)) continue;
    batch.delete(doc.ref);
    count += 1;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (count % 400 !== 0) {
    await batch.commit();
  }
}

async function seed() {
  const db = initAdmin();

  const organizations = schools.map((school) => ({ id: school.slug, data: buildOrganizationDoc(school) }));
  const programs = schools.flatMap((school) => buildProgramDocs(school));
  const scholarships = schools.flatMap((school) => buildScholarshipDocs(school));

  await pruneSeededDocs(db, "organizations", new Set(organizations.map((item) => item.id)));
  await pruneSeededDocs(db, "posts", new Set(programs.map((item) => item.id)));
  await pruneSeededDocs(db, "scholarships", new Set(scholarships.map((item) => item.id)));

  const writes = [
    ...organizations.map((item) => ({ collection: "organizations", ...item })),
    ...programs.map((item) => ({ collection: "posts", ...item })),
    ...scholarships.map((item) => ({ collection: "scholarships", ...item })),
  ];

  let batch = db.batch();
  let index = 0;

  for (const write of writes) {
    batch.set(db.collection(write.collection).doc(write.id), write.data, { merge: true });
    index += 1;
    if (index % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (index % 400 !== 0) {
    await batch.commit();
  }

  console.log(`Seeded ${organizations.length} schools, ${programs.length} programs, and ${scholarships.length} scholarships.`);
}

seed().catch((error) => {
  console.error("Failed to seed school showcase:", error);
  process.exit(1);
});
