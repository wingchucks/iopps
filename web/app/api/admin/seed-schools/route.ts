// Admin endpoint to seed multiple Indigenous schools across Canada
import { NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Canadian Indigenous Post-Secondary Institutions
const canadianIndigenousSchools = [
  // SASKATCHEWAN
  {
    name: "First Nations University of Canada",
    shortName: "FNUniv",
    slug: "fnuniv",
    type: "university" as const,
    established: 1976,
    website: "https://fnuniv.ca",
    description: "First Nations University of Canada is a unique Canadian institution that specializes in Indigenous knowledge, providing post-secondary education for Indigenous and non-Indigenous students within a culturally supportive environment. As a federated college of the University of Regina, FNUniv offers degree programs in arts, science, business, and Indigenous studies.",
    headOffice: {
      address: "1 First Nations Way",
      city: "Regina",
      province: "Saskatchewan",
      postalCode: "S4S 7K2",
    },
    indigenousServices: {
      elderInResidence: true,
      culturalCoordinators: true,
      academicCoaches: true,
      languagePrograms: ["Cree", "Saulteaux", "Dakota", "Dene"],
      culturalProgramming: true,
      ceremonySpace: true,
    },
    stats: { indigenousStudentPercentage: 85 },
    verification: { isVerified: true, indigenousControlled: true },
    contact: { email: "info@fnuniv.ca", phone: "306-790-5950" },
  },
  {
    name: "Gabriel Dumont Institute",
    shortName: "GDI",
    slug: "gabriel-dumont-institute",
    type: "college" as const,
    established: 1980,
    website: "https://gdins.org",
    description: "Gabriel Dumont Institute is the educational, employment and cultural arm of the Métis Nation–Saskatchewan. GDI delivers Métis-specific education and training, cultural preservation, and research programs throughout Saskatchewan.",
    headOffice: {
      address: "917 22nd Street West",
      city: "Saskatoon",
      province: "Saskatchewan",
      postalCode: "S7M 0R9",
    },
    indigenousServices: {
      elderInResidence: true,
      culturalCoordinators: true,
      languagePrograms: ["Michif"],
      culturalProgramming: true,
    },
    stats: { indigenousStudentPercentage: 95 },
    verification: { isVerified: true, indigenousControlled: true },
    contact: { email: "info@gdins.org", phone: "306-242-6070" },
  },

  // BRITISH COLUMBIA
  {
    name: "Nicola Valley Institute of Technology",
    shortName: "NVIT",
    slug: "nvit",
    type: "polytechnic" as const,
    established: 1983,
    website: "https://nvit.ca",
    description: "Nicola Valley Institute of Technology (NVIT) is the only public Indigenous post-secondary institution in British Columbia. Founded by five First Nations bands, NVIT provides quality education with Indigenous values and perspectives integrated throughout all programs.",
    headOffice: {
      address: "4155 Belshaw Street",
      city: "Merritt",
      province: "British Columbia",
      postalCode: "V1K 1R1",
    },
    campuses: [
      { id: "merritt", name: "Merritt Campus", city: "Merritt", province: "British Columbia", isMain: true },
      { id: "vancouver", name: "Vancouver Campus", city: "Vancouver", province: "British Columbia", isMain: false },
    ],
    indigenousServices: {
      elderInResidence: true,
      culturalCoordinators: true,
      academicCoaches: true,
      languagePrograms: ["Nlaka'pamux", "Secwépemc"],
      culturalProgramming: true,
      ceremonySpace: true,
    },
    stats: { indigenousStudentPercentage: 70 },
    verification: { isVerified: true, indigenousControlled: true },
    contact: { email: "info@nvit.ca", phone: "250-378-3300" },
  },
  {
    name: "Native Education College",
    shortName: "NEC",
    slug: "native-education-college",
    type: "college" as const,
    established: 1967,
    website: "https://necvancouver.org",
    description: "Native Education College (NEC) in Vancouver is one of the oldest Indigenous post-secondary institutions in Canada. NEC provides culturally supportive education and training programs designed specifically for Indigenous adult learners.",
    headOffice: {
      address: "285 East 5th Avenue",
      city: "Vancouver",
      province: "British Columbia",
      postalCode: "V5T 1H2",
    },
    indigenousServices: {
      elderInResidence: true,
      culturalCoordinators: true,
      culturalProgramming: true,
      ceremonySpace: true,
    },
    stats: { indigenousStudentPercentage: 90 },
    verification: { isVerified: true, indigenousControlled: true },
    contact: { email: "info@necvancouver.org", phone: "604-873-3761" },
  },

  // ONTARIO
  {
    name: "First Nations Technical Institute",
    shortName: "FNTI",
    slug: "fnti",
    type: "college" as const,
    established: 1985,
    website: "https://fnti.net",
    description: "FNTI is an Indigenous-owned and governed post-secondary institute located in Tyendinaga Mohawk Territory, Ontario. Accredited by the World Indigenous Nations Higher Education Consortium (WINHEC), FNTI creates educational pathways for Indigenous Peoples through culturally-grounded programming.",
    headOffice: {
      address: "3 Old York Road",
      city: "Tyendinaga Mohawk Territory",
      province: "Ontario",
      postalCode: "K0K 1X0",
    },
    indigenousServices: {
      elderInResidence: true,
      culturalCoordinators: true,
      academicCoaches: true,
      languagePrograms: ["Mohawk", "Ojibwe"],
      culturalProgramming: true,
      ceremonySpace: true,
    },
    stats: { indigenousStudentPercentage: 95 },
    verification: { isVerified: true, indigenousControlled: true },
    contact: { email: "info@fnti.net", phone: "613-396-2122" },
  },
  {
    name: "Six Nations Polytechnic",
    shortName: "SNP",
    slug: "six-nations-polytechnic",
    type: "polytechnic" as const,
    established: 1993,
    website: "https://snpolytechnic.com",
    description: "Six Nations Polytechnic is a leader in Indigenous education located in Ohsweken on the Six Nations of the Grand River Territory. SNP offers Indigenous-centered post-secondary programs and is working toward full accreditation under Ontario's Indigenous Institutes Act.",
    headOffice: {
      address: "2160 Fourth Line",
      city: "Ohsweken",
      province: "Ontario",
      postalCode: "N0A 1M0",
    },
    indigenousServices: {
      elderInResidence: true,
      culturalCoordinators: true,
      languagePrograms: ["Mohawk", "Cayuga", "Onondaga", "Oneida", "Seneca", "Tuscarora"],
      culturalProgramming: true,
      ceremonySpace: true,
    },
    stats: { indigenousStudentPercentage: 80 },
    verification: { isVerified: true, indigenousControlled: true },
    contact: { email: "info@snpolytechnic.com", phone: "519-445-0023" },
  },
  {
    name: "Kenjgewin Teg",
    shortName: "KT",
    slug: "kenjgewin-teg",
    type: "college" as const,
    established: 1994,
    website: "https://kenjgewinteg.ca",
    description: "Kenjgewin Teg Educational Institute serves the seven First Nations of Manitoulin Island and the North Shore region. The institute provides culturally-based programming rooted in Anishinaabe language, culture, and traditions.",
    headOffice: {
      address: "374 Highway 551",
      city: "M'Chigeeng First Nation",
      province: "Ontario",
      postalCode: "P0P 1G0",
    },
    indigenousServices: {
      elderInResidence: true,
      culturalCoordinators: true,
      languagePrograms: ["Anishinaabemowin", "Ojibwe"],
      culturalProgramming: true,
      ceremonySpace: true,
    },
    stats: { indigenousStudentPercentage: 95 },
    verification: { isVerified: true, indigenousControlled: true },
    contact: { email: "info@kenjgewinteg.ca", phone: "705-377-4411" },
  },
  {
    name: "Seven Generations Education Institute",
    shortName: "SGEI",
    slug: "seven-generations",
    type: "college" as const,
    established: 1985,
    website: "https://www.7generations.org",
    description: "Seven Generations Education Institute serves Treaty #3 territory in Northwestern Ontario. SGEI provides Indigenous-focused post-secondary education and training programs that honor Anishinaabe teachings and prepare students for success.",
    headOffice: {
      address: "154 First Street",
      city: "Fort Frances",
      province: "Ontario",
      postalCode: "P9A 1L6",
    },
    indigenousServices: {
      elderInResidence: true,
      culturalCoordinators: true,
      languagePrograms: ["Anishinaabemowin"],
      culturalProgramming: true,
      ceremonySpace: true,
    },
    stats: { indigenousStudentPercentage: 90 },
    verification: { isVerified: true, indigenousControlled: true },
    contact: { email: "info@7generations.org", phone: "807-274-2796" },
  },

  // ALBERTA
  {
    name: "Blue Quills University",
    shortName: "BQU",
    slug: "blue-quills",
    type: "university" as const,
    established: 1971,
    website: "https://bluequills.ca",
    description: "Blue Quills University, formerly Blue Quills First Nations College, was the first Indigenous-controlled educational institution in Canada. Located on the former Blue Quills Indian Residential School site, BQU transforms a place of trauma into a center of healing and education.",
    headOffice: {
      address: "Box 189",
      city: "Saddle Lake",
      province: "Alberta",
      postalCode: "T0A 3T0",
    },
    indigenousServices: {
      elderInResidence: true,
      culturalCoordinators: true,
      languagePrograms: ["Cree"],
      culturalProgramming: true,
      ceremonySpace: true,
    },
    stats: { indigenousStudentPercentage: 95 },
    verification: { isVerified: true, indigenousControlled: true },
    contact: { email: "info@bluequills.ca", phone: "780-645-4455" },
  },
  {
    name: "Red Crow Community College",
    shortName: "RCCC",
    slug: "red-crow",
    type: "college" as const,
    established: 1986,
    website: "https://redcrowcollege.com",
    description: "Red Crow Community College serves the Kainai Nation (Blood Tribe) in southern Alberta. The college integrates Blackfoot language, culture, and traditions throughout all programming while preparing students for careers and further education.",
    headOffice: {
      address: "Highway 2 North",
      city: "Standoff",
      province: "Alberta",
      postalCode: "T0L 1Y0",
    },
    indigenousServices: {
      elderInResidence: true,
      culturalCoordinators: true,
      languagePrograms: ["Blackfoot"],
      culturalProgramming: true,
      ceremonySpace: true,
    },
    stats: { indigenousStudentPercentage: 95 },
    verification: { isVerified: true, indigenousControlled: true },
    contact: { email: "info@redcrowcollege.com", phone: "403-737-2400" },
  },
  {
    name: "Old Sun Community College",
    shortName: "OSCC",
    slug: "old-sun",
    type: "college" as const,
    established: 1971,
    website: "https://oldsuncollege.ca",
    description: "Old Sun Community College serves the Siksika Nation east of Calgary. The college provides culturally-relevant education and training programs that integrate Blackfoot language and traditions.",
    headOffice: {
      address: "Box 339",
      city: "Siksika",
      province: "Alberta",
      postalCode: "T0J 3W0",
    },
    indigenousServices: {
      elderInResidence: true,
      culturalCoordinators: true,
      languagePrograms: ["Blackfoot"],
      culturalProgramming: true,
      ceremonySpace: true,
    },
    stats: { indigenousStudentPercentage: 95 },
    verification: { isVerified: true, indigenousControlled: true },
    contact: { email: "info@oldsuncollege.ca", phone: "403-734-3862" },
  },

  // QUEBEC
  {
    name: "Institution Kiuna",
    shortName: "Kiuna",
    slug: "kiuna",
    type: "college" as const,
    established: 2011,
    website: "https://kiuna.ca",
    description: "Institution Kiuna is Quebec's only Indigenous-controlled post-secondary institution. Located in Odanak, Kiuna offers CEGEP-level programs in a culturally supportive environment that celebrates the diversity of First Nations across Quebec.",
    headOffice: {
      address: "586 rue Waban-Aki",
      city: "Odanak",
      province: "Quebec",
      postalCode: "J0G 1H0",
    },
    indigenousServices: {
      elderInResidence: true,
      culturalCoordinators: true,
      languagePrograms: ["Abenaki", "Innu", "Atikamekw", "Cree", "Mohawk"],
      culturalProgramming: true,
      ceremonySpace: true,
    },
    stats: { indigenousStudentPercentage: 100 },
    verification: { isVerified: true, indigenousControlled: true },
    contact: { email: "info@kiuna.ca", phone: "450-568-9298" },
  },

  // MANITOBA
  {
    name: "University College of the North",
    shortName: "UCN",
    slug: "ucn",
    type: "college" as const,
    established: 2004,
    website: "https://ucn.ca",
    description: "University College of the North serves Northern Manitoba with campuses in The Pas and Thompson plus regional centres across the north. UCN is committed to community and learner-centered education reflecting Indigenous perspectives and values.",
    headOffice: {
      address: "436 7th Street",
      city: "The Pas",
      province: "Manitoba",
      postalCode: "R9A 1T7",
    },
    campuses: [
      { id: "the-pas", name: "The Pas Campus", city: "The Pas", province: "Manitoba", isMain: true },
      { id: "thompson", name: "Thompson Campus", city: "Thompson", province: "Manitoba", isMain: false },
    ],
    indigenousServices: {
      elderInResidence: true,
      culturalCoordinators: true,
      languagePrograms: ["Cree", "Dene"],
      culturalProgramming: true,
      ceremonySpace: true,
    },
    stats: { indigenousStudentPercentage: 70 },
    verification: { isVerified: true, indigenousControlled: false },
    contact: { email: "info@ucn.ca", phone: "204-627-8500" },
  },
];

// Sample programs to add to each school
const samplePrograms = [
  {
    name: "Indigenous Studies Certificate",
    slug: "indigenous-studies-certificate",
    description: "Explore the rich history, cultures, and contemporary issues facing Indigenous peoples in Canada. This foundational program provides a strong base for further education or community work.",
    category: "Indigenous Studies" as const,
    level: "certificate" as const,
    deliveryMethod: "hybrid" as const,
    duration: { value: 1, unit: "years" as const },
    indigenousFocused: true,
    indigenousContentPercentage: 80,
    isPublished: true,
    status: "approved" as const,
  },
  {
    name: "Office Administration",
    slug: "office-administration",
    description: "Develop essential administrative and office management skills. Graduates are prepared for careers in band offices, tribal councils, and various organizations.",
    category: "Business & Management" as const,
    level: "certificate" as const,
    deliveryMethod: "in-person" as const,
    duration: { value: 10, unit: "months" as const },
    indigenousFocused: false,
    isPublished: true,
    status: "approved" as const,
  },
  {
    name: "Social Service Worker",
    slug: "social-service-worker",
    description: "Prepare to support individuals and families in Indigenous communities. This program integrates cultural teachings with professional social work practices.",
    category: "Social Work & Community" as const,
    level: "diploma" as const,
    deliveryMethod: "hybrid" as const,
    duration: { value: 2, unit: "years" as const },
    indigenousFocused: true,
    indigenousContentPercentage: 40,
    isPublished: true,
    status: "approved" as const,
  },
  {
    name: "Early Childhood Education",
    slug: "early-childhood-education",
    description: "Learn to create nurturing and culturally-responsive learning environments for young children. Graduates work in Head Start programs, daycares, and family support services.",
    category: "Education & Teaching" as const,
    level: "diploma" as const,
    deliveryMethod: "in-person" as const,
    duration: { value: 2, unit: "years" as const },
    indigenousFocused: true,
    indigenousContentPercentage: 35,
    isPublished: true,
    status: "approved" as const,
  },
];

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];

    if (!auth || !db) {
      return NextResponse.json({ error: "Firebase not initialized" }, { status: 500 });
    }

    const firestore = db;
    const decodedToken = await auth.verifyIdToken(token);

    // Check if user is admin
    const userDoc = await firestore.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const results: { school: string; schoolId: string; programs: number; status: string }[] = [];

    for (const school of canadianIndigenousSchools) {
      // Check if school already exists
      const existingSchool = await firestore
        .collection("schools")
        .where("slug", "==", school.slug)
        .get();

      let schoolId: string;

      if (!existingSchool.empty) {
        schoolId = existingSchool.docs[0].id;
        // Update existing
        await firestore.collection("schools").doc(schoolId).update({
          ...school,
          updatedAt: FieldValue.serverTimestamp(),
        });
        results.push({ school: school.name, schoolId, programs: 0, status: "updated" });
      } else {
        // Create new school with unclaimed status
        const schoolRef = await firestore.collection("schools").add({
          ...school,
          employerId: `unclaimed-${school.slug}`,
          claimStatus: "unclaimed", // KEY: Mark as unclaimed
          isPublished: true,
          indigenousFocused: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        schoolId = schoolRef.id;
        await schoolRef.update({ id: schoolId });

        // Add sample programs for new schools
        let programCount = 0;
        for (const program of samplePrograms) {
          await firestore.collection("educationPrograms").add({
            ...program,
            schoolId,
            schoolName: school.name,
            viewsCount: Math.floor(Math.random() * 200) + 50,
            savesCount: Math.floor(Math.random() * 20) + 5,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          programCount++;
        }

        results.push({ school: school.name, schoolId, programs: programCount, status: "created" });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} Indigenous schools`,
      schools: results,
      viewUrl: "https://iopps.ca/education/schools",
    });
  } catch (error) {
    console.error("Error seeding schools:", error);
    return NextResponse.json(
      { error: "Failed to seed schools", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Seed Canadian Indigenous Schools",
    endpoint: "/api/admin/seed-schools",
    method: "POST",
    schoolCount: canadianIndigenousSchools.length,
    schools: canadianIndigenousSchools.map(s => ({ name: s.name, slug: s.slug, province: s.headOffice.province })),
  });
}
