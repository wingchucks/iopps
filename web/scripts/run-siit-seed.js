// Quick script to seed SIIT data using Firebase Admin SDK
// Run with: node scripts/run-siit-seed.js

const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  // Check for service account or use application default credentials
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  
  if (serviceAccountPath) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Try to use default credentials
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
}

const db = admin.firestore();

// SIIT School Data (from seed-siit/route.ts)
const siitSchool = {
  name: "Saskatchewan Indian Institute of Technologies",
  shortName: "SIIT",
  slug: "siit",
  type: "tribal_college",
  established: 1976,
  website: "https://siit.ca",
  description: `Saskatchewan Indian Institute of Technologies (SIIT) is one of the first post-secondary institutes in the country to be fully governed by First Nations leaders, and the only Indigenous accrediting post-secondary institution in Saskatchewan.

SIIT's core mission is rooted in serving the 74 First Nations of Saskatchewan, with a student population that is more than 90% Indigenous. We deliver certificate and diploma programs in trades, business, information technology, health and community studies, and adult basic education to more than 2,400 students annually.

Our campuses in Regina, Saskatoon, and Prince Albert, along with eight Career Centres throughout the province, ensure accessible education for Indigenous learners across Saskatchewan.`,

  headOffice: {
    address: "100 - 103A Packham Avenue",
    city: "Saskatoon",
    province: "Saskatchewan",
    postalCode: "S7N 4K4",
  },

  campuses: [
    {
      id: "saskatoon",
      name: "Saskatoon Campus",
      address: "100 - 103A Packham Avenue",
      city: "Saskatoon",
      province: "Saskatchewan",
      phone: "306-244-4444",
      isMain: true,
    },
    {
      id: "regina",
      name: "Regina Campus",
      address: "118 - 335 Packham Place",
      city: "Regina",
      province: "Saskatchewan",
      phone: "306-477-7905",
      isMain: false,
    },
    {
      id: "prince-albert",
      name: "Prince Albert Campus",
      address: "48 - 12th Street East",
      city: "Prince Albert",
      province: "Saskatchewan",
      phone: "306-765-2500",
      isMain: false,
    },
  ],

  indigenousServices: {
    elderInResidence: true,
    culturalCoordinators: true,
    academicCoaches: true,
    learningSpecialists: true,
    wellnessCoaches: true,
    psychologists: true,
    languagePrograms: ["Cree", "Saulteaux", "Dene", "Dakota"],
    culturalProgramming: true,
    ceremonySpace: true,
    communitySupports: ["housing", "childcare", "transportation", "financial aid"],
  },

  stats: {
    indigenousStudentPercentage: 92,
    totalPrograms: 30,
    totalEnrollment: 2400,
    nationsRepresented: 74,
  },

  verification: {
    isVerified: true,
    indigenousControlled: true,
    accreditation: ["Saskatchewan Higher Education Quality Assurance Board"],
  },

  contact: {
    admissionsEmail: "admissions@siit.ca",
    admissionsPhone: "1-877-282-5622",
    email: "info@siit.ca",
    phone: "306-244-4444",
  },

  social: {
    facebook: "https://facebook.com/SIITsask",
    instagram: "https://instagram.com/siitsask",
    twitter: "https://twitter.com/SIITsask",
    linkedin: "https://linkedin.com/company/siit",
    youtube: "https://youtube.com/@siitsask",
  },

  logoUrl: "https://siit.ca/wp-content/uploads/2021/03/siit_logo-sm.png",
  bannerUrl: "https://siit.ca/wp-content/uploads/2025/02/1-Where-do-I-start.jpg.webp",

  isPublished: true,
  indigenousFocused: true,
  isVerified: true,
  status: "approved",
  active: true,
};

// Simplified programs list
const siitPrograms = [
  {
    name: "Business Administration Diploma",
    slug: "business-administration-diploma",
    description: "Develop essential business skills in accounting, marketing, human resources, and management.",
    category: "Business & Management",
    level: "diploma",
    deliveryMethod: "hybrid",
    duration: { value: 2, unit: "years" },
    fullTime: true,
    indigenousFocused: true,
    tuition: { domestic: 4500, per: "year" },
    isPublished: true,
    status: "approved",
  },
  {
    name: "Indigenous Practical Nursing",
    slug: "indigenous-practical-nursing",
    description: "Culturally responsive nursing program preparing learners to provide holistic healthcare integrating Indigenous knowledge and Western medicine.",
    category: "Healthcare & Nursing",
    level: "diploma",
    deliveryMethod: "in-person",
    duration: { value: 18, unit: "months" },
    fullTime: true,
    indigenousFocused: true,
    tuition: { domestic: 8500, per: "program" },
    isPublished: true,
    status: "approved",
  },
  {
    name: "Welding Applied Certificate",
    slug: "welding-applied-certificate",
    description: "Hands-on welding training covering SMAW, GMAW, FCAW, and GTAW processes.",
    category: "Trades & Industrial",
    level: "certificate",
    deliveryMethod: "in-person",
    duration: { value: 20, unit: "weeks" },
    fullTime: true,
    indigenousFocused: false,
    tuition: { domestic: 3500, per: "program" },
    isPublished: true,
    status: "approved",
  },
  {
    name: "Mental Health and Wellness Diploma",
    slug: "mental-health-wellness-diploma",
    description: "Prepare to support mental health and wellness in Indigenous communities, combining traditional Indigenous healing with contemporary mental health practices.",
    category: "Social Work & Community",
    level: "diploma",
    deliveryMethod: "hybrid",
    duration: { value: 2, unit: "years" },
    fullTime: true,
    indigenousFocused: true,
    tuition: { domestic: 4200, per: "year" },
    isPublished: true,
    status: "approved",
  },
  {
    name: "Information Technology Diploma",
    slug: "information-technology-diploma",
    description: "Comprehensive IT training covering networking, cybersecurity, cloud computing, and software applications.",
    category: "Technology & IT",
    level: "diploma",
    deliveryMethod: "hybrid",
    duration: { value: 2, unit: "years" },
    fullTime: true,
    indigenousFocused: false,
    tuition: { domestic: 5200, per: "year" },
    isPublished: true,
    status: "approved",
  },
];

async function seedSIIT() {
  console.log('Starting SIIT seed...');

  try {
    // Check if SIIT already exists
    const existingSchool = await db.collection("schools").where("slug", "==", "siit").get();

    let schoolId;

    if (!existingSchool.empty) {
      // Update existing school
      schoolId = existingSchool.docs[0].id;
      console.log(`Updating existing SIIT school (${schoolId})...`);
      await db.collection("schools").doc(schoolId).update({
        ...siitSchool,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Create new school
      console.log('Creating new SIIT school...');
      const schoolRef = await db.collection("schools").add({
        ...siitSchool,
        employerId: "demo-siit",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      schoolId = schoolRef.id;
      await schoolRef.update({ id: schoolId });
    }

    console.log(`School ID: ${schoolId}`);

    // Delete existing programs from sub-collection
    console.log('Clearing existing programs...');
    const existingPrograms = await db.collection("schools").doc(schoolId).collection("programs").get();
    const deletePromises = existingPrograms.docs.map((doc) => doc.ref.delete());
    await Promise.all(deletePromises);

    // Create programs as sub-collection
    console.log('Creating programs...');
    const programPromises = siitPrograms.map(async (program) => {
      const programRef = await db.collection("schools").doc(schoolId).collection("programs").add({
        ...program,
        schoolId,
        schoolName: siitSchool.name,
        viewsCount: Math.floor(Math.random() * 500) + 100,
        savesCount: Math.floor(Math.random() * 50) + 10,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return programRef.id;
    });

    const programIds = await Promise.all(programPromises);

    console.log('\n✅ SIIT data seeded successfully!');
    console.log(`School ID: ${schoolId}`);
    console.log(`Programs created: ${programIds.length}`);
    console.log(`View at: https://iopps.ca/education/schools/siit`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding SIIT data:', error);
    process.exit(1);
  }
}

seedSIIT();
