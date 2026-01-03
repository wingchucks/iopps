// Admin endpoint to seed SIIT demo data
import { NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// SIIT School Data
const siitSchool = {
  name: "Saskatchewan Indian Institute of Technologies",
  shortName: "SIIT",
  slug: "siit",
  type: "tribal_college" as const,
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
    {
      id: "aviation",
      name: "Saskatchewan Aviation Learning Centre",
      address: "Saskatoon International Airport",
      city: "Saskatoon",
      province: "Saskatchewan",
      phone: "306-244-4444",
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

  logoUrl: "https://siit.ca/wp-content/uploads/2023/01/SIIT-Logo.png",
  bannerUrl: "https://siit.ca/wp-content/uploads/2023/05/siit-campus-banner.jpg",

  isPublished: true,
  indigenousFocused: true,
  isVerified: true,
  status: "approved" as const,
};

// SIIT Programs
const siitPrograms = [
  {
    name: "Business Administration Diploma",
    slug: "business-administration-diploma",
    description: "Develop essential business skills in accounting, marketing, human resources, and management. This program prepares graduates for careers in business and provides a pathway to university degree completion through transfer agreements with the University of Saskatchewan and University of Lethbridge.",
    shortDescription: "Comprehensive business training with university transfer options",
    category: "Business & Management" as const,
    level: "diploma" as const,
    deliveryMethod: "hybrid" as const,
    duration: { value: 2, unit: "years" as const },
    fullTime: true,
    partTimeAvailable: true,
    indigenousFocused: true,
    tuition: { domestic: 4500, per: "year" as const },
    careerOutcomes: {
      description: "Graduates work in business administration, accounting, marketing, and management roles",
      occupations: ["Business Administrator", "Office Manager", "Marketing Coordinator", "Human Resources Assistant"],
      salaryRange: { min: 45000, max: 65000 },
      employmentRate: 85,
    },
    transferPathways: [
      { institution: "University of Saskatchewan", program: "Bachelor of Commerce", creditsTransferred: 60 },
      { institution: "University of Lethbridge", program: "Bachelor of Management", creditsTransferred: 60 },
    ],
    applicationUrl: "https://siit.ca/programs/business-administration-diploma/",
    sourceUrl: "https://siit.ca/programs/business-administration-diploma/",
    isPublished: true,
    status: "approved" as const,
  },
  {
    name: "Indigenous Practical Nursing",
    slug: "indigenous-practical-nursing",
    description: "This culturally responsive nursing program prepares learners to provide holistic healthcare integrating Indigenous knowledge and Western medicine. Graduates are eligible to write the Canadian Practical Nurse Registration Examination.",
    shortDescription: "Culturally responsive nursing education for Indigenous communities",
    category: "Healthcare & Nursing" as const,
    level: "diploma" as const,
    deliveryMethod: "in-person" as const,
    duration: { value: 18, unit: "months" as const },
    fullTime: true,
    partTimeAvailable: false,
    indigenousFocused: true,
    indigenousContentPercentage: 30,
    tuition: { domestic: 8500, per: "program" as const },
    admissionRequirements: {
      education: "Grade 12 or Adult 12",
      prerequisites: ["Biology 30", "English 30", "Math 20"],
      other: ["Criminal Record Check", "Immunizations", "CPR Certification"],
    },
    careerOutcomes: {
      description: "Licensed Practical Nurses work in hospitals, clinics, long-term care, and community health settings",
      occupations: ["Licensed Practical Nurse", "Community Health Nurse", "Long-Term Care Nurse"],
      salaryRange: { min: 50000, max: 72000 },
      employmentRate: 95,
    },
    applicationUrl: "https://siit.ca/programs/indigenous-practical-nursing/",
    sourceUrl: "https://siit.ca/programs/indigenous-practical-nursing/",
    isPublished: true,
    status: "approved" as const,
  },
  {
    name: "Welding Applied Certificate",
    slug: "welding-applied-certificate",
    description: "Hands-on welding training covering SMAW, GMAW, FCAW, and GTAW processes. Graduates are prepared for entry-level positions in the welding industry with pathways to journeyperson certification.",
    shortDescription: "Industry-ready welding skills with multiple process training",
    category: "Trades & Industrial" as const,
    level: "certificate" as const,
    deliveryMethod: "in-person" as const,
    duration: { value: 20, unit: "weeks" as const },
    fullTime: true,
    partTimeAvailable: false,
    indigenousFocused: false,
    tuition: { domestic: 3500, per: "program" as const },
    careerOutcomes: {
      description: "Entry-level welding positions in construction, manufacturing, and resource industries",
      occupations: ["Welder", "Fabricator", "Welding Assistant"],
      salaryRange: { min: 45000, max: 85000 },
      employmentRate: 90,
    },
    applicationUrl: "https://siit.ca/programs/welding/",
    sourceUrl: "https://siit.ca/programs/welding/",
    isPublished: true,
    status: "approved" as const,
  },
  {
    name: "Mental Health and Wellness Diploma",
    slug: "mental-health-wellness-diploma",
    description: "Prepare to support mental health and wellness in Indigenous communities. This program combines traditional Indigenous healing approaches with contemporary mental health practices, preparing graduates for community-based support roles.",
    shortDescription: "Integrating Indigenous healing with mental health support",
    category: "Social Work & Community" as const,
    level: "diploma" as const,
    deliveryMethod: "hybrid" as const,
    duration: { value: 2, unit: "years" as const },
    fullTime: true,
    partTimeAvailable: true,
    indigenousFocused: true,
    indigenousContentPercentage: 45,
    tuition: { domestic: 4200, per: "year" as const },
    careerOutcomes: {
      description: "Community mental health workers, addictions counselors, and wellness coordinators",
      occupations: ["Mental Health Worker", "Community Support Worker", "Addictions Counselor", "Wellness Coordinator"],
      salaryRange: { min: 42000, max: 60000 },
      employmentRate: 88,
    },
    applicationUrl: "https://siit.ca/programs/mental-health-wellness/",
    sourceUrl: "https://siit.ca/programs/mental-health-wellness/",
    isPublished: true,
    status: "approved" as const,
  },
  {
    name: "Indigenous Early Childhood Education Certificate",
    slug: "indigenous-early-childhood-education",
    description: "Learn to create culturally responsive learning environments for Indigenous children. This program integrates Indigenous languages, traditions, and land-based learning with early childhood education principles.",
    shortDescription: "Culturally grounded early childhood education",
    category: "Education & Teaching" as const,
    level: "certificate" as const,
    deliveryMethod: "hybrid" as const,
    duration: { value: 1, unit: "years" as const },
    fullTime: true,
    partTimeAvailable: true,
    indigenousFocused: true,
    indigenousContentPercentage: 50,
    tuition: { domestic: 3800, per: "year" as const },
    careerOutcomes: {
      description: "Early childhood educators in daycares, Head Start programs, and on-reserve childcare",
      occupations: ["Early Childhood Educator", "Daycare Worker", "Head Start Teacher"],
      salaryRange: { min: 35000, max: 50000 },
      employmentRate: 92,
    },
    applicationUrl: "https://siit.ca/programs/indigenous-early-childhood-education/",
    sourceUrl: "https://siit.ca/programs/indigenous-early-childhood-education/",
    isPublished: true,
    status: "approved" as const,
  },
  {
    name: "Aircraft Maintenance Engineering",
    slug: "aircraft-maintenance-engineering",
    description: "A Transport Canada approved program at the Saskatchewan Aviation Learning Centre. Students gain hands-on experience maintaining aircraft, preparing for careers in the aviation industry.",
    shortDescription: "Transport Canada approved aviation maintenance training",
    category: "Trades & Industrial" as const,
    level: "diploma" as const,
    deliveryMethod: "in-person" as const,
    duration: { value: 2, unit: "years" as const },
    fullTime: true,
    partTimeAvailable: false,
    indigenousFocused: false,
    tuition: { domestic: 12000, per: "year" as const },
    admissionRequirements: {
      education: "Grade 12",
      prerequisites: ["Physics 30", "Math 30"],
      englishRequirement: "English 30",
    },
    careerOutcomes: {
      description: "Aircraft maintenance technicians for airlines, charter companies, and maintenance organizations",
      occupations: ["Aircraft Maintenance Engineer", "Aviation Technician", "Line Maintenance Technician"],
      salaryRange: { min: 55000, max: 95000 },
      employmentRate: 88,
    },
    applicationUrl: "https://siit.ca/programs/aircraft-maintenance/",
    sourceUrl: "https://siit.ca/programs/aircraft-maintenance/",
    isPublished: true,
    status: "approved" as const,
  },
  {
    name: "Legal Paraprofessional Diploma",
    slug: "legal-paraprofessional-diploma",
    description: "NEW FOR 2025 - Prepare for a career supporting legal services in Indigenous communities. This program covers legal research, document preparation, court procedures, and Indigenous law.",
    shortDescription: "NEW 2025 - Legal support training with Indigenous law focus",
    category: "Law & Justice" as const,
    level: "diploma" as const,
    deliveryMethod: "hybrid" as const,
    duration: { value: 2, unit: "years" as const },
    fullTime: true,
    partTimeAvailable: true,
    indigenousFocused: true,
    indigenousContentPercentage: 35,
    tuition: { domestic: 4800, per: "year" as const },
    featured: true,
    careerOutcomes: {
      description: "Legal assistants, paralegals, and court workers in Indigenous and mainstream legal settings",
      occupations: ["Legal Assistant", "Paralegal", "Court Worker", "Band Administrator (Legal)"],
      salaryRange: { min: 45000, max: 70000 },
    },
    applicationUrl: "https://siit.ca/programs/legal-paraprofessional/",
    sourceUrl: "https://siit.ca/programs/legal-paraprofessional/",
    isPublished: true,
    status: "approved" as const,
  },
  {
    name: "Indigenous Project Management Advanced Certificate",
    slug: "indigenous-project-management",
    description: "NEW FOR 2025 - Advanced training in project management with an Indigenous lens. Learn to manage projects that respect Indigenous governance, community engagement, and cultural protocols.",
    shortDescription: "NEW 2025 - Project management for Indigenous contexts",
    category: "Business & Management" as const,
    level: "certificate" as const,
    deliveryMethod: "online" as const,
    duration: { value: 6, unit: "months" as const },
    fullTime: false,
    partTimeAvailable: true,
    indigenousFocused: true,
    indigenousContentPercentage: 60,
    tuition: { domestic: 2800, per: "program" as const },
    featured: true,
    admissionRequirements: {
      education: "Post-secondary credential or 3+ years work experience",
    },
    careerOutcomes: {
      description: "Project managers, coordinators, and administrators in Indigenous organizations",
      occupations: ["Project Manager", "Program Coordinator", "Community Development Officer"],
      salaryRange: { min: 55000, max: 85000 },
    },
    applicationUrl: "https://siit.ca/programs/indigenous-project-management/",
    sourceUrl: "https://siit.ca/programs/indigenous-project-management/",
    isPublished: true,
    status: "approved" as const,
  },
  {
    name: "Information Technology Diploma",
    slug: "information-technology-diploma",
    description: "Comprehensive IT training covering networking, cybersecurity, cloud computing, and software applications. Graduates are prepared for careers in IT support, network administration, and system analysis.",
    shortDescription: "Full-stack IT skills for the digital economy",
    category: "Technology & IT" as const,
    level: "diploma" as const,
    deliveryMethod: "hybrid" as const,
    duration: { value: 2, unit: "years" as const },
    fullTime: true,
    partTimeAvailable: true,
    indigenousFocused: false,
    tuition: { domestic: 5200, per: "year" as const },
    careerOutcomes: {
      description: "IT support, network administration, and systems roles",
      occupations: ["IT Support Specialist", "Network Administrator", "Systems Analyst", "Help Desk Technician"],
      salaryRange: { min: 50000, max: 75000 },
      employmentRate: 87,
    },
    applicationUrl: "https://siit.ca/programs/information-technology/",
    sourceUrl: "https://siit.ca/programs/information-technology/",
    isPublished: true,
    status: "approved" as const,
  },
  {
    name: "Adult Basic Education",
    slug: "adult-basic-education",
    description: "Complete your Grade 12 equivalency in a supportive, culturally appropriate environment. This program prepares adult learners for employment or further post-secondary education.",
    shortDescription: "Grade 12 completion for adult learners",
    category: "Other" as const,
    level: "certificate" as const,
    deliveryMethod: "in-person" as const,
    duration: { value: 10, unit: "months" as const },
    fullTime: true,
    partTimeAvailable: true,
    indigenousFocused: true,
    tuition: { domestic: 0, per: "program" as const },
    careerOutcomes: {
      description: "Pathway to employment or further education",
      occupations: ["Entry-level positions", "Post-secondary programs"],
    },
    applicationUrl: "https://siit.ca/programs/adult-basic-education/",
    sourceUrl: "https://siit.ca/programs/adult-basic-education/",
    isPublished: true,
    status: "approved" as const,
  },
];

export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);

    // Check if user is admin
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Check if SIIT already exists
    const existingSchool = await db
      .collection("schools")
      .where("slug", "==", "siit")
      .get();

    let schoolId: string;

    if (!existingSchool.empty) {
      // Update existing school
      schoolId = existingSchool.docs[0].id;
      await db.collection("schools").doc(schoolId).update({
        ...siitSchool,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      // Create new school
      const schoolRef = await db.collection("schools").add({
        ...siitSchool,
        employerId: "demo-siit", // Demo employer ID
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      schoolId = schoolRef.id;
      // Update with its own ID
      await schoolRef.update({ id: schoolId });
    }

    // Delete existing SIIT programs to avoid duplicates
    const existingPrograms = await db
      .collection("educationPrograms")
      .where("schoolId", "==", schoolId)
      .get();

    const deletePromises = existingPrograms.docs.map((doc) => doc.ref.delete());
    await Promise.all(deletePromises);

    // Create programs
    const programPromises = siitPrograms.map(async (program) => {
      const programRef = await db.collection("educationPrograms").add({
        ...program,
        schoolId,
        schoolName: siitSchool.name,
        viewsCount: Math.floor(Math.random() * 500) + 100, // Random view count for demo
        savesCount: Math.floor(Math.random() * 50) + 10,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return programRef.id;
    });

    const programIds = await Promise.all(programPromises);

    return NextResponse.json({
      success: true,
      message: "SIIT data seeded successfully",
      schoolId,
      programCount: programIds.length,
      programIds,
      viewUrl: `https://iopps.ca/education/schools/siit`,
    });
  } catch (error) {
    console.error("Error seeding SIIT data:", error);
    return NextResponse.json(
      { error: "Failed to seed SIIT data", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST with admin authentication to seed SIIT data",
    endpoint: "/api/admin/seed-siit",
    method: "POST",
    headers: {
      Authorization: "Bearer <admin-firebase-token>",
    },
  });
}
