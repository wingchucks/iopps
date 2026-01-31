import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// National Training Programs research compiled January 2026
const NATIONAL_TRAINING_PROGRAMS = [
  // ============================================
  // GOVERNMENT OF CANADA PROGRAMS
  // ============================================
  {
    title: "First Nations & Inuit Skills Link Program",
    provider: "Indigenous Services Canada",
    providerLogo: "https://www.canada.ca/etc/designs/canada/wet-boew/assets/favicon.ico",
    providerWebsite: "https://www.sac-isc.gc.ca/eng/1100100033627/1533125289674",
    category: "employment",
    type: "training",
    level: "beginner",
    format: "hybrid",
    duration: "Up to 11 months",
    description: "Supports the development of essential employability skills among First Nations and Inuit youth. Includes career promotion, co-op placements, internships, mentored work placements, and science/technology activities.",
    skills: ["employability", "communication", "problem-solving", "teamwork"],
    field: "Employment Readiness",
    eligibility: "First Nations & Inuit youth ages 15-30",
    fundingAvailable: true,
    fundingSource: "Government funded - up to 100% wage costs",
    cost: "Free",
    region: "Canada",
    applyUrl: "https://www.sac-isc.gc.ca/eng/1100100033627/1533125289674",
    featured: true,
  },
  {
    title: "First Nations & Inuit Summer Work Experience Program",
    provider: "Indigenous Services Canada",
    providerLogo: "https://www.canada.ca/etc/designs/canada/wet-boew/assets/favicon.ico",
    providerWebsite: "https://www.sac-isc.gc.ca/eng/1100100033610/1533125433575",
    category: "employment",
    type: "training",
    level: "beginner",
    format: "in-person",
    duration: "Summer (minimum 80 hours)",
    description: "Provides summer employment opportunities for First Nations and Inuit students to gain work experience, develop employability skills, and earn income to support their education.",
    skills: ["work-experience", "employability", "career-exploration"],
    field: "Summer Employment",
    eligibility: "First Nations & Inuit secondary/post-secondary students, ages 15-30",
    fundingAvailable: true,
    fundingSource: "Wage subsidies available",
    cost: "Free",
    region: "Canada",
    applyUrl: "https://www.sac-isc.gc.ca/eng/1100100033610/1533125433575",
    featured: true,
  },

  // ============================================
  // CCIB PROGRAMS
  // ============================================
  {
    title: "Tools for Indigenous Business (TIB)",
    provider: "Canadian Council for Indigenous Business",
    providerLogo: "https://www.ccib.ca/wp-content/uploads/2021/02/CCIB-logo.png",
    providerWebsite: "https://www.ccib.ca/programs/",
    category: "business",
    type: "training",
    level: "beginner",
    format: "online",
    duration: "Self-paced",
    description: "Provides practical tools, training, and networks to help Indigenous entrepreneurs grow their business. Includes templates, worksheets, guides, and connection to CCIB members committed to Indigenous entrepreneurship.",
    skills: ["business-planning", "entrepreneurship", "networking"],
    field: "Business & Entrepreneurship",
    eligibility: "Indigenous entrepreneurs and business owners",
    fundingAvailable: false,
    cost: "Contact provider",
    region: "Canada",
    applyUrl: "https://www.ccib.ca/programs/",
    featured: true,
  },
  {
    title: "Capital Skills",
    provider: "Canadian Council for Indigenous Business",
    providerLogo: "https://www.ccib.ca/wp-content/uploads/2021/02/CCIB-logo.png",
    providerWebsite: "https://www.ccib.ca/programs/",
    category: "business",
    type: "training",
    level: "intermediate",
    format: "online",
    duration: "Self-paced",
    description: "Online learning platform providing a space to meet, learn, ask questions, and plan next steps with community support. Created specifically for Indigenous entrepreneurs and business owners.",
    skills: ["financial-literacy", "business-management", "capital-raising"],
    field: "Business Finance",
    eligibility: "Indigenous entrepreneurs and business owners",
    fundingAvailable: false,
    cost: "Contact provider",
    region: "Canada",
    applyUrl: "https://www.ccib.ca/programs/",
  },
  {
    title: "Schulich Mini-MBA for Indigenous Leaders",
    provider: "Canadian Council for Indigenous Business / Schulich School of Business",
    providerLogo: "https://www.ccib.ca/wp-content/uploads/2021/02/CCIB-logo.png",
    providerWebsite: "https://www.ccib.ca/programs/",
    category: "business",
    type: "certificate",
    level: "advanced",
    format: "online",
    duration: "3 months (12 sessions)",
    description: "Virtual program with 12 instructor-led, interactive sessions taught over 3 months. Designed to fit busy schedules of working professionals seeking Indigenous business leadership skills.",
    skills: ["leadership", "management", "business-strategy", "executive-education"],
    field: "Business Leadership",
    eligibility: "Indigenous business leaders and professionals",
    fundingAvailable: false,
    cost: "Contact provider",
    region: "Canada",
    applyUrl: "https://www.ccib.ca/programs/",
    featured: true,
  },
  {
    title: "CCIB Connects Mentorship Program",
    provider: "Canadian Council for Indigenous Business",
    providerLogo: "https://www.ccib.ca/wp-content/uploads/2021/02/CCIB-logo.png",
    providerWebsite: "https://www.ccib.ca/programs/",
    category: "business",
    type: "training",
    level: "intermediate",
    format: "hybrid",
    duration: "Ongoing",
    description: "Develops the ability for industry Leaders to foster and grow relationships, providing mutual support and exchanging industry-specific insights to Learners for navigating their respective field of expertise.",
    skills: ["mentorship", "networking", "industry-knowledge"],
    field: "Professional Development",
    eligibility: "Indigenous professionals and entrepreneurs",
    fundingAvailable: false,
    cost: "Contact provider",
    region: "Canada",
    applyUrl: "https://www.ccib.ca/programs/",
  },

  // ============================================
  // INDIGENOUS CLEAN ENERGY
  // ============================================
  {
    title: "20/20 Catalysts Program",
    provider: "Indigenous Clean Energy",
    providerLogo: "https://indigenouscleanenergy.com/wp-content/uploads/2021/07/ICE-Logo.png",
    providerWebsite: "https://indigenouscleanenergy.com/our-programs/",
    category: "environment",
    type: "training",
    level: "intermediate",
    format: "hybrid",
    duration: "6-12 months",
    description: "Award-winning Indigenous clean energy capacity-building program that has equipped over 100 participants with tools and resources to become clean energy leaders in their communities.",
    skills: ["clean-energy", "project-management", "community-leadership", "sustainability"],
    field: "Clean Energy",
    eligibility: "Indigenous community members interested in clean energy leadership",
    fundingAvailable: true,
    cost: "Free",
    region: "Canada",
    applyUrl: "https://indigenouscleanenergy.com/our-programs/",
    featured: true,
  },
  {
    title: "Generation Power - Youth Clean Energy Careers",
    provider: "Indigenous Clean Energy",
    providerLogo: "https://indigenouscleanenergy.com/wp-content/uploads/2021/07/ICE-Logo.png",
    providerWebsite: "https://indigenouscleanenergy.com/our-programs/",
    category: "environment",
    type: "training",
    level: "beginner",
    format: "hybrid",
    duration: "Varies",
    description: "Encourages Indigenous youth to explore careers in clean energy and fosters their leadership potential to advance a sustainable and equitable energy future.",
    skills: ["clean-energy", "career-exploration", "leadership", "sustainability"],
    field: "Clean Energy",
    eligibility: "Indigenous youth",
    fundingAvailable: true,
    cost: "Free",
    region: "Canada",
    applyUrl: "https://indigenouscleanenergy.com/our-programs/",
  },
  {
    title: "ImaGENation Youth Program",
    provider: "Indigenous Clean Energy",
    providerLogo: "https://indigenouscleanenergy.com/wp-content/uploads/2021/07/ICE-Logo.png",
    providerWebsite: "https://indigenouscleanenergy.com/our-programs/",
    category: "environment",
    type: "training",
    level: "beginner",
    format: "hybrid",
    duration: "Varies",
    description: "Capacity-building program that supports Indigenous youth to launch clean energy projects grounded in cultural identity, mentorship, and peer-to-peer support.",
    skills: ["project-development", "clean-energy", "cultural-identity", "peer-support"],
    field: "Clean Energy",
    eligibility: "Indigenous youth",
    fundingAvailable: true,
    cost: "Free",
    region: "Canada",
    applyUrl: "https://indigenouscleanenergy.com/our-programs/",
  },
  {
    title: "ICE Mentorship Program",
    provider: "Indigenous Clean Energy",
    providerLogo: "https://indigenouscleanenergy.com/wp-content/uploads/2021/07/ICE-Logo.png",
    providerWebsite: "https://indigenouscleanenergy.com/our-programs/",
    category: "environment",
    type: "training",
    level: "intermediate",
    format: "online",
    duration: "Ongoing",
    description: "Connects eligible ICE program participants with industry-leading experts from across the spectrum of the clean energy space for personalized mentorship.",
    skills: ["mentorship", "clean-energy", "professional-development", "networking"],
    field: "Clean Energy",
    eligibility: "ICE program participants",
    fundingAvailable: true,
    cost: "Free",
    region: "Canada",
    applyUrl: "https://indigenouscleanenergy.com/our-programs/",
  },

  // ============================================
  // RUPERTSLAND INSTITUTE (ALBERTA)
  // ============================================
  {
    title: "Métis Training to Employment",
    provider: "Rupertsland Institute",
    providerLogo: "https://www.rupertsland.org/wp-content/uploads/2021/03/RLI-Logo.png",
    providerWebsite: "https://www.rupertsland.org/metis-training-to-employment-program/",
    category: "employment",
    type: "training",
    level: "beginner",
    format: "hybrid",
    duration: "Varies",
    description: "Comprehensive employment services for Métis individuals including certificate programs under 52 weeks, short-term training, safety certifications, job search assistance, resume building, and employment partnerships.",
    skills: ["employability", "job-search", "resume-writing", "interview-skills"],
    field: "Employment Readiness",
    eligibility: "Métis individuals in Alberta",
    fundingAvailable: true,
    fundingSource: "Funding available for eligible clients",
    cost: "Free for eligible Métis",
    region: "AB",
    applyUrl: "https://www.rupertsland.org/metis-training-to-employment-program/",
    featured: true,
  },
  {
    title: "Youth Summer Employment Program",
    provider: "Rupertsland Institute",
    providerLogo: "https://www.rupertsland.org/wp-content/uploads/2021/03/RLI-Logo.png",
    providerWebsite: "https://www.rupertsland.org/metis-training-to-employment-program/",
    category: "employment",
    type: "training",
    level: "beginner",
    format: "in-person",
    duration: "Summer term",
    description: "Summer employment available to eligible Métis youth who are returning to school in the fall. Rupertsland Institute supports wages of summer student employment opportunities.",
    skills: ["work-experience", "employability"],
    field: "Summer Employment",
    eligibility: "Métis youth ages 15-30 returning to school",
    fundingAvailable: true,
    fundingSource: "Wage support available",
    cost: "Free",
    region: "AB",
    applyUrl: "https://www.rupertsland.org/metis-training-to-employment-program/",
  },
  {
    title: "Métis Entrepreneurship Workshop",
    provider: "Rupertsland Institute",
    providerLogo: "https://www.rupertsland.org/wp-content/uploads/2021/03/RLI-Logo.png",
    providerWebsite: "https://www.metisentrepreneurs.com/",
    category: "business",
    type: "workshop",
    level: "beginner",
    format: "hybrid",
    duration: "Workshop series",
    description: "Expert-led workshops with curriculum developed specifically for Métis Entrepreneurs. Learn business fundamentals, planning, and growth strategies.",
    skills: ["entrepreneurship", "business-planning", "financial-management"],
    field: "Business & Entrepreneurship",
    eligibility: "Métis entrepreneurs in Alberta",
    fundingAvailable: true,
    cost: "Free for eligible participants",
    region: "AB",
    applyUrl: "https://www.metisentrepreneurs.com/",
  },

  // ============================================
  // NACCA PROGRAMS
  // ============================================
  {
    title: "Indigenous Women's Entrepreneurship (IWE) Program",
    provider: "National Aboriginal Capital Corporations Association",
    providerLogo: "https://nacca.ca/wp-content/uploads/2019/12/nacca-logo.png",
    providerWebsite: "https://nacca.ca/become-an-entrepreneur/",
    category: "business",
    type: "training",
    level: "beginner",
    format: "hybrid",
    duration: "Varies",
    description: "Supports Indigenous women entrepreneurs through access to Indigenous Financial Institutions, business loans, non-repayable contributions, financial consulting, and business start-up services.",
    skills: ["entrepreneurship", "business-planning", "financial-management", "networking"],
    field: "Women's Entrepreneurship",
    eligibility: "Indigenous women entrepreneurs",
    fundingAvailable: true,
    fundingSource: "Access to business loans and contributions",
    cost: "Varies by service",
    region: "Canada",
    applyUrl: "https://nacca.ca/iwe",
    featured: true,
  },
  {
    title: "Indigenous Youth Entrepreneurship (IYE) Program",
    provider: "National Aboriginal Capital Corporations Association",
    providerLogo: "https://nacca.ca/wp-content/uploads/2019/12/nacca-logo.png",
    providerWebsite: "https://nacca.ca/become-an-entrepreneur/",
    category: "business",
    type: "training",
    level: "beginner",
    format: "hybrid",
    duration: "Varies",
    description: "Supports Indigenous youth entrepreneurs with business development, access to financing, mentorship, and entrepreneurship education.",
    skills: ["entrepreneurship", "business-planning", "mentorship"],
    field: "Youth Entrepreneurship",
    eligibility: "Indigenous youth entrepreneurs",
    fundingAvailable: true,
    fundingSource: "Access to business loans and support",
    cost: "Varies by service",
    region: "Canada",
    applyUrl: "https://nacca.ca/become-an-entrepreneur/",
  },

  // ============================================
  // TECHNATION
  // ============================================
  {
    title: "Indigenous Pathways - Tech Career Exploration",
    provider: "TECHNATION",
    providerLogo: "https://technationcanada.ca/wp-content/uploads/2021/01/technation-logo.png",
    providerWebsite: "https://technationcanada.ca/en/future-workforce-development/career-ready-program/indigenous_pathways/",
    category: "technology",
    type: "training",
    level: "beginner",
    format: "hybrid",
    duration: "Ongoing events",
    description: "Outreach and engagement initiative for Indigenous post-secondary students. Hosts gatherings and circles where students connect with leaders in the tech industry through conversational networking.",
    skills: ["tech-careers", "networking", "career-exploration"],
    field: "Technology",
    eligibility: "Indigenous post-secondary students",
    fundingAvailable: false,
    cost: "Free",
    region: "Canada",
    applyUrl: "https://technationcanada.ca/en/future-workforce-development/career-ready-program/indigenous_pathways/",
  },

  // ============================================
  // MINING INDUSTRY (MiHR)
  // ============================================
  {
    title: "Mining Essentials - Work Readiness Training",
    provider: "Mining Industry Human Resources Council (MiHR)",
    providerLogo: "https://mihr.ca/wp-content/uploads/2020/02/MiHR-logo.png",
    providerWebsite: "https://mihr.ca/cmsds/training/training/",
    category: "trades",
    type: "training",
    level: "beginner",
    format: "in-person",
    duration: "6-12 weeks",
    description: "Work readiness training specifically designed for Indigenous Peoples entering the mining sector. Teaches essential and work readiness skills validated by industry as necessary for mining employment.",
    skills: ["mining", "safety", "employability", "technical-skills"],
    field: "Mining & Resources",
    eligibility: "Indigenous peoples interested in mining careers",
    fundingAvailable: true,
    cost: "Contact provider",
    region: "Canada",
    applyUrl: "https://mihr.ca/cmsds/training/training/",
    featured: true,
  },
  {
    title: "Mining Potential - Essential Skills Training",
    provider: "Mining Industry Human Resources Council (MiHR)",
    providerLogo: "https://mihr.ca/wp-content/uploads/2020/02/MiHR-logo.png",
    providerWebsite: "https://mihr.ca/cmsds/training/training/",
    category: "trades",
    type: "training",
    level: "beginner",
    format: "hybrid",
    duration: "Varies",
    description: "Essential skills training program for the mining industry covering foundational and technical skills needed to be safe and effective.",
    skills: ["mining", "safety", "essential-skills"],
    field: "Mining & Resources",
    eligibility: "Anyone interested in mining careers",
    fundingAvailable: true,
    cost: "Contact provider",
    region: "Canada",
    applyUrl: "https://mihr.ca/cmsds/training/training/",
  },

  // ============================================
  // NVIT (BC)
  // ============================================
  {
    title: "Community Education - In-Community Training",
    provider: "Nicola Valley Institute of Technology (NVIT)",
    providerLogo: "https://www.nvit.ca/wp-content/uploads/2022/04/nvit-logo.png",
    providerWebsite: "https://www.nvit.ca/community-education/",
    category: "various",
    type: "training",
    level: "beginner",
    format: "in-person",
    duration: "Varies by program",
    description: "Brings educational opportunities directly to Indigenous communities across BC and Canada. Allows learners to study in their own community while balancing work and family commitments.",
    skills: ["varies"],
    field: "Various",
    eligibility: "Indigenous community members",
    fundingAvailable: true,
    cost: "Varies by program",
    region: "BC",
    applyUrl: "https://www.nvit.ca/community-education/",
  },

  // ============================================
  // INDSPIRE
  // ============================================
  {
    title: "Indspire Mentoring Programs",
    provider: "Indspire",
    providerLogo: "https://indspire.ca/wp-content/uploads/2021/01/indspire-logo.png",
    providerWebsite: "https://indspire.ca/programs/",
    category: "education",
    type: "training",
    level: "beginner",
    format: "hybrid",
    duration: "Ongoing",
    description: "Mentoring programs connecting Indigenous students with mentors to support their educational journey and career development. Includes access to bursaries, scholarships, and youth conferences.",
    skills: ["mentorship", "career-development", "networking"],
    field: "Education Support",
    eligibility: "First Nations, Inuit, and Métis students",
    fundingAvailable: true,
    fundingSource: "Bursaries and scholarships available",
    cost: "Free",
    region: "Canada",
    applyUrl: "https://indspire.ca/programs/",
  },

  // ============================================
  // SIIT QUICK TRAINING
  // ============================================
  {
    title: "JobSeries - Pre-Employment Training",
    provider: "Saskatchewan Indian Institute of Technologies",
    providerLogo: "https://siit.ca/wp-content/uploads/2021/01/siit-logo.png",
    providerWebsite: "https://siit.ca",
    category: "employment",
    type: "training",
    level: "beginner",
    format: "in-person",
    duration: "2-6 weeks",
    description: "Foundational, in-community pre-employment training delivered across Saskatchewan. Prepares participants with essential work-readiness skills for employment.",
    skills: ["employability", "work-readiness", "job-search"],
    field: "Employment Readiness",
    eligibility: "Indigenous job seekers in Saskatchewan",
    fundingAvailable: true,
    cost: "Free",
    region: "SK",
    applyUrl: "https://siit.ca",
    featured: true,
  },
  {
    title: "JobConnections - Career Services",
    provider: "Saskatchewan Indian Institute of Technologies",
    providerLogo: "https://siit.ca/wp-content/uploads/2021/01/siit-logo.png",
    providerWebsite: "https://siit.ca",
    category: "employment",
    type: "training",
    level: "beginner",
    format: "in-person",
    duration: "Ongoing support",
    description: "Employment services with 9 centres province-wide connecting job seekers to employment opportunities. Includes mobile career services for rural communities. Over 1000 employers work with JobConnections every year.",
    skills: ["job-search", "career-counselling", "employer-connections"],
    field: "Employment Services",
    eligibility: "Job seekers in Saskatchewan",
    fundingAvailable: true,
    cost: "Free",
    region: "SK",
    applyUrl: "https://siit.ca",
  },
];

// Helper to generate slug
function generateSlug(title: string, provider: string): string {
  const base = `${title}-${provider}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
  return base;
}

// POST /api/admin/seed-training-programs
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const secret = request.headers.get("x-admin-secret");
    if (secret !== "seed-training-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { force } = await request.json().catch(() => ({ force: false }));

    // Check if programs already exist
    const existingSnap = await db.collection("training_programs").limit(1).get();
    
    if (!existingSnap.empty && !force) {
      const countSnap = await db.collection("training_programs").count().get();
      return NextResponse.json({ 
        message: "Training programs already exist. Use force: true to add more.",
        existingCount: countSnap.data().count 
      });
    }

    // Seed programs
    const batch = db.batch();
    const programIds: string[] = [];

    for (const program of NATIONAL_TRAINING_PROGRAMS) {
      const ref = db.collection("training_programs").doc();
      const slug = generateSlug(program.title, program.provider);
      
      batch.set(ref, {
        ...program,
        slug,
        status: "approved",
        isPublished: true,
        active: true,
        viewCount: 0,
        clickCount: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      programIds.push(ref.id);
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      programsCreated: NATIONAL_TRAINING_PROGRAMS.length,
      programIds,
      categories: [...new Set(NATIONAL_TRAINING_PROGRAMS.map(p => p.category))],
      providers: [...new Set(NATIONAL_TRAINING_PROGRAMS.map(p => p.provider))],
    });

  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Seed failed", details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Check status
export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const programsSnap = await db.collection("training_programs").get();
    
    const byProvider: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byRegion: Record<string, number> = {};
    
    programsSnap.docs.forEach(doc => {
      const data = doc.data();
      const provider = data.provider || "Unknown";
      const category = data.category || "Unknown";
      const region = data.region || "Unknown";
      
      byProvider[provider] = (byProvider[provider] || 0) + 1;
      byCategory[category] = (byCategory[category] || 0) + 1;
      byRegion[region] = (byRegion[region] || 0) + 1;
    });

    return NextResponse.json({
      totalPrograms: programsSnap.size,
      byProvider,
      byCategory,
      byRegion,
    });

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
