/**
 * IOPPS Test Account Seeder
 *
 * Creates canonical test accounts for automated QA testing.
 * These accounts bypass email verification and approval workflows.
 *
 * Usage:
 *   node scripts/seed-test-accounts.js
 *
 * With dotenv (if needed):
 *   node -r dotenv/config scripts/seed-test-accounts.js
 */

const admin = require("firebase-admin");

// ============================================
// Configuration
// ============================================

const TEST_PASSWORD = "TestIOPPS2025!";

const MEMBER_ACCOUNT = {
  email: "sarah.whitebear@test.iopps.ca",
  displayName: "Sarah Whitebear",
};

const ORG_ACCOUNT = {
  email: "hello@northernlightsconsulting.ca",
  displayName: "Northern Lights Indigenous Consulting",
};

// ============================================
// Initialize Firebase Admin
// ============================================

function initializeFirebaseAdmin() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  // Check if using emulators
  const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

  if (useEmulators) {
    process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
    console.log("Using Firebase Emulators");

    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: projectId || "iopps-c2224",
      });
    }
  } else {
    if (!projectId || !clientEmail || !privateKey) {
      console.error(
        "Missing Firebase credentials. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables."
      );
      process.exit(1);
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
  }

  return {
    db: admin.firestore(),
    auth: admin.auth(),
  };
}

// ============================================
// Helper Functions
// ============================================

async function getOrCreateAuthUser(auth, email, password, displayName) {
  try {
    // Try to get existing user
    const existingUser = await auth.getUserByEmail(email);
    console.log(`  > Auth user already exists: ${existingUser.uid}`);

    // Update to ensure email is verified
    await auth.updateUser(existingUser.uid, {
      emailVerified: true,
      disabled: false,
    });

    return existingUser.uid;
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      // Create new user
      const newUser = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true,
        disabled: false,
      });
      console.log(`  > Auth user created: ${newUser.uid}`);
      return newUser.uid;
    }
    throw error;
  }
}

// ============================================
// Create Member Account (Sarah Whitebear)
// ============================================

async function createMemberAccount(db, auth) {
  console.log("\nCreating Community Member: Sarah Whitebear");
  console.log("-".repeat(50));

  // 1. Create/Get Auth User
  const uid = await getOrCreateAuthUser(
    auth,
    MEMBER_ACCOUNT.email,
    TEST_PASSWORD,
    MEMBER_ACCOUNT.displayName
  );

  const now = admin.firestore.FieldValue.serverTimestamp();

  // 2. Create User Document
  await db
    .collection("users")
    .doc(uid)
    .set(
      {
        id: uid,
        email: MEMBER_ACCOUNT.email,
        displayName: MEMBER_ACCOUNT.displayName,
        role: "community",
        createdAt: now,
        disabled: false,
        deletedAt: null,
      },
      { merge: true }
    );
  console.log(`  > User document created: users/${uid}`);

  // 3. Create Member Profile
  const memberProfile = {
    id: uid,
    userId: uid,
    displayName: MEMBER_ACCOUNT.displayName,
    avatarUrl: null,
    photoURL: null,
    tagline:
      "Indigenous Education Consultant | Curriculum Developer | Community Advocate",
    bio: `Sarah Whitebear is a passionate Indigenous education consultant with over 12 years of experience developing culturally responsive curricula and training programs. Originally from Muskeg Lake Cree Nation in Treaty 6 territory, Sarah combines traditional knowledge with modern educational practices to create meaningful learning experiences.

Her work focuses on integrating Indigenous perspectives into mainstream education, developing cultural competency training for organizations, and advocating for equitable access to educational resources for Indigenous communities. Sarah is fluent in Cree (Nehiyaw) and is actively involved in language revitalization efforts.

When not consulting, Sarah enjoys beading, participating in community ceremonies, and mentoring the next generation of Indigenous educators.`,
    location: "Saskatoon, Saskatchewan",
    indigenousAffiliation: "Cree (Nehiyaw) - Muskeg Lake Cree Nation, Treaty 6",

    // Skills
    skills: [
      "Curriculum Development",
      "Indigenous Education",
      "Cultural Integration",
      "Workshop Facilitation",
      "Community Engagement",
      "Grant Writing",
      "Program Evaluation",
      "Public Speaking",
      "Cree Language (Intermediate)",
      "Cross-Cultural Communication",
    ],

    // Work Experience
    experience: [
      {
        id: "exp-001",
        company: "Saskatchewan Indigenous Cultural Centre",
        position: "Senior Education Consultant",
        location: "Saskatoon, SK",
        startDate: "2019-03",
        endDate: null,
        current: true,
        description:
          "Lead consultant for curriculum development projects. Design and deliver cultural competency training programs for schools and organizations. Manage relationships with First Nations communities and educational institutions.",
      },
      {
        id: "exp-002",
        company: "Treaty 6 Education Council",
        position: "Curriculum Development Specialist",
        location: "Saskatoon, SK",
        startDate: "2015-09",
        endDate: "2019-02",
        current: false,
        description:
          "Developed culturally relevant educational materials for K-12 students. Collaborated with Elders and knowledge keepers to ensure authentic representation. Led professional development workshops for teachers.",
      },
      {
        id: "exp-003",
        company: "Muskeg Lake Cree Nation School",
        position: "Elementary Teacher",
        location: "Muskeg Lake, SK",
        startDate: "2011-09",
        endDate: "2015-06",
        current: false,
        description:
          "Taught grades 4-6 with focus on integrating Cree language and culture. Developed land-based learning programs. Coached community sports teams.",
      },
    ],

    // Education
    education: [
      {
        id: "edu-001",
        institution: "First Nations University of Canada",
        degree: "Master of Education",
        fieldOfStudy: "Indigenous Education",
        startDate: "2013-09",
        endDate: "2015-06",
        current: false,
        description:
          "Thesis: 'Integrating Traditional Knowledge into Modern Curriculum: A Cree Perspective'",
      },
      {
        id: "edu-002",
        institution: "University of Saskatchewan",
        degree: "Bachelor of Education",
        fieldOfStudy: "Elementary Education",
        startDate: "2007-09",
        endDate: "2011-04",
        current: false,
        description:
          "Specialized in Indigenous education stream. Dean's List all years.",
      },
    ],

    // Portfolio
    portfolio: [
      {
        id: "port-001",
        title: "Treaty 6 Curriculum Guide",
        description:
          "Comprehensive K-12 curriculum guide for teaching Treaty 6 history and contemporary issues.",
        url: "https://example.com/treaty6-curriculum",
        tags: ["Curriculum", "Treaty Education", "K-12"],
      },
      {
        id: "port-002",
        title: "Cultural Competency Training Program",
        description:
          "8-module training program for healthcare professionals working with Indigenous communities.",
        url: "https://example.com/cultural-training",
        tags: ["Training", "Healthcare", "Cultural Competency"],
      },
    ],

    // Resume & Quick Apply
    resumeUrl: null,
    quickApplyEnabled: true,
    defaultCoverLetter: `Dear Hiring Manager,

I am writing to express my interest in this position. With over 12 years of experience in Indigenous education and curriculum development, I bring a unique combination of traditional knowledge and modern educational practices to every role.

My background includes developing culturally responsive curricula, leading community engagement initiatives, and training educators and organizations on Indigenous perspectives. I am passionate about creating meaningful change and advancing reconciliation through education.

I would welcome the opportunity to discuss how my experience and dedication can contribute to your team.

Miigwech (Thank you),
Sarah Whitebear`,

    // Availability
    availableForInterviews: "Available for interviews with 24-48 hours notice",
    messagingHandle: "@sarahwhitebear",

    // Education Pillar Settings
    educationInterests: {
      seekingEducation: false,
      educationLevelInterested: [],
      fieldsInterested: [],
      preferredDelivery: [],
      preferredLocations: [],
      timeline: "exploring",
    },

    // Timestamps
    createdAt: now,
    updatedAt: now,
  };

  await db
    .collection("memberProfiles")
    .doc(uid)
    .set(memberProfile, { merge: true });
  console.log(`  > Member profile created: memberProfiles/${uid}`);
  console.log(`  > Email verified: true`);
}

// ============================================
// Create Organization Account (Northern Lights)
// ============================================

async function createOrganizationAccount(db, auth) {
  console.log("\nCreating Organization: Northern Lights Indigenous Consulting");
  console.log("-".repeat(50));

  // 1. Create/Get Auth User
  const uid = await getOrCreateAuthUser(
    auth,
    ORG_ACCOUNT.email,
    TEST_PASSWORD,
    ORG_ACCOUNT.displayName
  );

  const now = admin.firestore.FieldValue.serverTimestamp();
  const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  // 2. Create User Document
  await db
    .collection("users")
    .doc(uid)
    .set(
      {
        id: uid,
        email: ORG_ACCOUNT.email,
        displayName: ORG_ACCOUNT.displayName,
        role: "employer",
        createdAt: now,
        disabled: false,
        deletedAt: null,
      },
      { merge: true }
    );
  console.log(`  > User document created: users/${uid}`);

  // 3. Create Employer Profile
  const employerProfile = {
    id: uid,
    userId: uid,
    organizationName: "Northern Lights Indigenous Consulting",
    slug: "northern-lights-indigenous-consulting",

    // Basic Info
    description: `Northern Lights Indigenous Consulting is a 100% Metis-owned consulting firm based in Saskatoon, Saskatchewan. We specialize in helping organizations build authentic relationships with Indigenous communities through cultural training, engagement strategy, and organizational transformation.

Our team brings lived experience and professional expertise to every project. We believe that meaningful reconciliation requires genuine partnership, mutual respect, and a commitment to long-term relationship building.

**Our Services Include:**
- Indigenous Cultural Competency Training
- Community Engagement Strategy
- Indigenous Employment Strategy Development
- TRC Calls to Action Implementation Support
- Indigenous Procurement Advisory
- Cross-Cultural Communication Workshops

Founded in 2018 by David Couture, a proud Metis entrepreneur from the Metis Nation-Saskatchewan, Northern Lights has grown to serve clients across Western Canada including governments, corporations, non-profits, and educational institutions.`,

    website: "https://northernlightsconsulting.ca",
    location: "Saskatoon, Saskatchewan",
    logoUrl: null,
    bannerUrl: null,

    // Enhanced Profile Fields
    socialLinks: {
      linkedin:
        "https://linkedin.com/company/northern-lights-indigenous-consulting",
      twitter: "https://twitter.com/northernlightic",
      facebook: "https://facebook.com/northernlightsic",
      instagram: "https://instagram.com/northernlightsic",
    },
    industry: "consulting",
    companySize: "11-50",
    foundedYear: 2018,
    contactEmail: "hello@northernlightsconsulting.ca",
    contactPhone: "+1 (306) 555-0198",

    // Status - APPROVED (bypasses approval workflow)
    status: "approved",
    approvedAt: now,
    approvedBy: "system-seed",

    // Publication - PUBLISHED (required for public directory visibility)
    publicationStatus: "PUBLISHED",
    directoryVisible: true,
    publishedAt: now,

    // Subscription - Active Professional tier
    subscription: {
      active: true,
      tier: "professional",
      purchasedAt: now,
      expiresAt: admin.firestore.Timestamp.fromDate(oneYearFromNow),
      paymentId: "test-seed-payment",
      amountPaid: 0,
      jobCredits: 50,
      jobCreditsUsed: 0,
      featuredJobCredits: 5,
      featuredJobCreditsUsed: 0,
      unlimitedPosts: false,
    },

    // Free Posting Grant (for testing)
    freePostingEnabled: true,
    freePostingReason: "Test account for QA automation",
    freePostingGrantedAt: now,
    freePostingGrantedBy: "system-seed",
    freePostingGrant: {
      enabled: true,
      grantType: "tier2",
      reason: "Test account for QA automation",
      jobCredits: 50,
      jobCreditsUsed: 0,
      featuredCredits: 10,
      featuredCreditsUsed: 0,
      unlimitedPosts: false,
      grantedAt: now,
      expiresAt: admin.firestore.Timestamp.fromDate(oneYearFromNow),
      grantedBy: "system-seed",
    },

    // Modules - Enable ALL for testing
    enabledModules: ["hire", "sell", "educate", "host", "funding"],
    moduleSettings: {
      hire: { enabled: true, setupComplete: true },
      sell: { enabled: true, setupComplete: true },
      educate: { enabled: true, setupComplete: true },
      host: { enabled: true, setupComplete: true },
      funding: { enabled: true, setupComplete: true },
    },
    lastActiveModule: "hire",

    // Indigenous Verification - APPROVED
    indigenousVerification: {
      status: "approved",
      isIndigenousOwned: true,
      isIndigenousLed: true,
      nationAffiliation: "Metis Nation-Saskatchewan",
      certifications: [
        "CCAB Certified Aboriginal Business",
        "SaskTenders Indigenous Vendor",
        "PSPC Indigenous Business Directory",
      ],
      requestedAt: now,
      reviewedAt: now,
      reviewedBy: "system-seed",
      reviewNotes: "Test account - auto-verified",
    },

    // TRC Alignment
    trcAlignment: {
      hasIndigenousHiringStrategy: true,
      leadershipTrainingComplete: true,
      isIndigenousOwned: true,
      commitmentStatement:
        "We are committed to advancing reconciliation through authentic Indigenous engagement and employment practices.",
    },

    // Team Members (founder as admin)
    // Note: Can't use serverTimestamp() inside arrays, so use Timestamp.now()
    teamMembers: [
      {
        id: uid,
        email: ORG_ACCOUNT.email,
        displayName: "David Couture",
        role: "admin",
        addedBy: uid,
        addedAt: admin.firestore.Timestamp.now(),
        lastAccessedAt: admin.firestore.Timestamp.now(),
      },
    ],
    teamSettings: {
      allowInvitations: true,
      defaultRole: "editor",
      maxTeamSize: 25,
    },

    // Notification Preferences
    notificationPreferences: {
      newApplications: true,
      applicationStatusChanges: true,
      jobExpiring: true,
      scheduledJobPublished: true,
      trainingProgramExpiring: true,
      trainingProgramPublished: true,
      trainingRegistrations: true,
      eventReminders: true,
      eventPublished: true,
      eventRegistrations: true,
      productServiceExpiring: true,
      productServicePublished: true,
      productServiceInquiries: true,
      scholarshipGrantExpiring: true,
      scholarshipGrantPublished: true,
      scholarshipApplications: true,
      teamInvitations: true,
      teamActivity: true,
      weeklyDigest: true,
      dailyActivitySummary: false,
      marketingEmails: false,
    },

    // Timestamps
    createdAt: now,
    updatedAt: now,
  };

  await db
    .collection("employers")
    .doc(uid)
    .set(employerProfile, { merge: true });
  console.log(`  > Employer profile created: employers/${uid}`);
  console.log(`  > Approval status: approved`);
  console.log(`  > Verification status: approved`);
  console.log(`  > Subscription status: active (Professional)`);
  console.log(`  > Enabled modules: hire, sell, educate, host, funding`);
}

// ============================================
// Main Execution
// ============================================

async function main() {
  console.log("\n IOPPS Test Account Seeder");
  console.log("=".repeat(50));

  try {
    const { db, auth } = initializeFirebaseAdmin();
    console.log("> Firebase Admin initialized\n");

    // Create test accounts
    await createMemberAccount(db, auth);
    await createOrganizationAccount(db, auth);

    // Print summary
    console.log("\n" + "=".repeat(50));
    console.log(" Test accounts ready!\n");

    console.log("Community Member Login:");
    console.log(`  Email: ${MEMBER_ACCOUNT.email}`);
    console.log(`  Password: ${TEST_PASSWORD}\n`);

    console.log("Organization Login:");
    console.log(`  Email: ${ORG_ACCOUNT.email}`);
    console.log(`  Password: ${TEST_PASSWORD}`);
    console.log(
      `  Public URL: /organizations/northern-lights-indigenous-consulting\n`
    );

    process.exit(0);
  } catch (error) {
    console.error("\n Error:", error);
    process.exit(1);
  }
}

main();
