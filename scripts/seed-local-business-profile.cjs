const admin = require("firebase-admin");

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "demo-iopps";
process.env.GCLOUD_PROJECT = projectId;
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST || "127.0.0.1:9199";

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();
const auth = admin.auth();

const uid = "local-org-owner";
const orgId = "org-local-northern-lights";
const email = "hello@northernlightsconsulting.ca";
const password = "TestIOPPS2025!";
const orgName = "Northern Lights Indigenous Consulting";
const orgSlug = "northern-lights-indigenous-consulting";
const now = new Date().toISOString();
const nextMonth = new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString();
const sixWeeks = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();
const twoMonths = new Date(Date.now() + 62 * 24 * 60 * 60 * 1000).toISOString();

const hours = {
  monday: { open: "9:00 AM", close: "5:00 PM", isOpen: true },
  tuesday: { open: "9:00 AM", close: "5:00 PM", isOpen: true },
  wednesday: { open: "9:00 AM", close: "5:00 PM", isOpen: true },
  thursday: { open: "9:00 AM", close: "5:00 PM", isOpen: true },
  friday: { open: "9:00 AM", close: "4:00 PM", isOpen: true },
  saturday: { open: "", close: "", isOpen: false },
  sunday: { open: "", close: "", isOpen: false },
};

async function upsertAuthUser() {
  try {
    await auth.getUser(uid);
    await auth.updateUser(uid, {
      email,
      password,
      displayName: orgName,
      emailVerified: true,
    });
  } catch {
    await auth.createUser({
      uid,
      email,
      password,
      displayName: orgName,
      emailVerified: true,
    });
  }

  await auth.setCustomUserClaims(uid, {
    role: "employer",
    employer: true,
    employerId: orgId,
    orgId,
  });
}

async function seedDocs() {
  await db.collection("organizations").doc(orgId).set(
    {
      name: orgName,
      slug: orgSlug,
      shortName: "Northern Lights",
      type: "employer",
      description:
        "Northern Lights Indigenous Consulting partners with First Nations, Métis, and Inuit organizations to create hiring pathways, workforce strategy, and community-led business growth.",
      tagline: "Community-rooted workforce strategy and Indigenous partnership support.",
      foundedYear: 2004,
      industry: "Professional Services",
      size: "11-50",
      location: { city: "Saskatoon", province: "Saskatchewan" },
      address: "245 River Landing Way, Saskatoon, Saskatchewan",
      website: "northernlightsconsulting.ca",
      contactEmail: email,
      phone: "(306) 555-0188",
      logoUrl: "/logo.png",
      bannerUrl: "/og-image.jpg",
      gallery: ["/og-image.jpg", "/logo.png"],
      tags: ["Recruitment", "Training", "First Nations"],
      services: ["Hiring", "Training", "Community Partnerships"],
      indigenousGroups: ["Métis"],
      nation: "Métis Nation-Saskatchewan",
      treatyTerritory: "Treaty 6",
      hours,
      verified: true,
      onboardingComplete: true,
      plan: "premium",
      subscriptionTier: "premium",
      subscriptionStatus: "active",
      openJobs: 1,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  await db.collection("employers").doc(orgId).set(
    {
      name: orgName,
      companyName: orgName,
      email,
      employerId: orgId,
      orgId,
      slug: orgSlug,
      onboardingComplete: true,
      plan: "premium",
      subscriptionTier: "premium",
      subscriptionStatus: "active",
      verified: true,
      description:
        "Local emulator employer profile for Northern Lights Indigenous Consulting.",
      website: "northernlightsconsulting.ca",
      phone: "(306) 555-0188",
      location: "Saskatoon, Saskatchewan",
      logoUrl: "/logo.png",
      updatedAt: now,
    },
    { merge: true }
  );

  await db.collection("users").doc(uid).set(
    {
      uid,
      email,
      displayName: orgName,
      role: "employer",
      employerId: orgId,
      orgId,
      onboardingComplete: true,
      updatedAt: now,
    },
    { merge: true }
  );

  await db.collection("members").doc(uid).set(
    {
      uid,
      email,
      displayName: orgName,
      community: "Métis Nation-Saskatchewan",
      location: "Saskatoon, Saskatchewan",
      bio: "Employer test account for local business profile development.",
      interests: ["business", "careers"],
      orgId,
      orgRole: "owner",
      role: "employer",
      joinedAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  await db.collection("jobs").doc("job-local-partnerships-manager").set(
    {
      title: "Community Partnerships Manager",
      slug: "community-partnerships-manager",
      description:
        "Lead Indigenous workforce partnerships, employer outreach, and community engagement programs across Saskatchewan.",
      location: "Saskatoon, Saskatchewan",
      employmentType: "Full-time",
      employerId: orgId,
      employerName: orgName,
      status: "active",
      active: true,
      featured: true,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  await db.collection("events").doc("event-local-leadership-forum").set(
    {
      title: "Indigenous Leadership Hiring Forum",
      employerId: orgId,
      orgId,
      organizerName: orgName,
      eventType: "Career Fair",
      date: nextMonth,
      location: "Saskatoon, Saskatchewan",
      status: "active",
      createdAt: now,
    },
    { merge: true }
  );

  await db.collection("scholarships").doc("scholarship-local-futures-fund").set(
    {
      title: "Northern Lights Futures Fund",
      employerId: orgId,
      orgId,
      organization: orgName,
      amount: 2500,
      deadline: sixWeeks,
      description:
        "Annual support for Indigenous students pursuing business, HR, and community development studies.",
      status: "active",
      createdAt: now,
    },
    { merge: true }
  );

  await db.collection("training_programs").doc("training-local-workforce-certificate").set(
    {
      title: "Workforce Partnership Certificate",
      orgId,
      orgName,
      provider: orgName,
      duration: "12 weeks",
      credential: "Certificate",
      campus: "Hybrid",
      location: "Saskatoon, Saskatchewan",
      active: true,
      createdAt: twoMonths,
    },
    { merge: true }
  );
}

async function main() {
  await upsertAuthUser();
  await seedDocs();

  console.log("Local business profile emulator data ready.");
  console.log(`Login: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Directory: http://localhost:3000/businesses`);
  console.log(`Public profile: http://localhost:3000/org/${orgSlug}`);
  console.log("Dashboard: http://localhost:3000/org/dashboard?tab=Edit%20Profile&section=Identity");
}

main().catch((error) => {
  console.error("Failed to seed local emulator data:", error);
  process.exitCode = 1;
});
