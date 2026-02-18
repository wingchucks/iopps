"use client";

import { useState } from "react";
import AdminRoute from "@/components/AdminRoute";
import NavBar from "@/components/NavBar";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { useAuth } from "@/lib/auth-context";
import { setOrganization } from "@/lib/firestore/organizations";
import { setPost } from "@/lib/firestore/posts";
import { addNotification } from "@/lib/firestore/notifications";
import { serverTimestamp } from "firebase/firestore";

const orgs = [
  {
    id: "siga",
    name: "Saskatchewan Indian Gaming Authority",
    shortName: "SIGA",
    type: "employer" as const,
    tier: "premium" as const,
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
    type: "employer" as const,
    tier: "premium" as const,
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
    type: "school" as const,
    tier: "school" as const,
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
    type: "school" as const,
    tier: "school" as const,
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
    type: "employer" as const,
    tier: "premium" as const,
    location: "Saskatoon, SK",
    description: "Construction and infrastructure services across Saskatchewan.",
    openJobs: 6,
    employees: "300+",
    since: "2025",
    verified: true,
    tags: ["Construction", "Infrastructure"],
  },
];

const posts = [
  {
    id: "job-executive-director-siga",
    type: "job" as const,
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
      "SIGA is seeking an experienced Executive Director to lead strategic planning, operations oversight, and community engagement initiatives across our seven casino properties in Saskatchewan.\n\nThe Executive Director will report directly to the Board of Directors and will be responsible for ensuring the organization's mission of Indigenous economic self-sufficiency is advanced through effective leadership and operational excellence.",
    responsibilities: [
      "Lead strategic planning and organizational development",
      "Oversee operations across all seven casino properties",
      "Build and maintain relationships with First Nations communities",
      "Manage annual budget of $200M+ and ensure fiscal responsibility",
      "Represent SIGA in government and industry consultations",
      "Drive Indigenous employment and community development initiatives",
    ],
    qualifications: [
      "10+ years of senior leadership experience",
      "Experience in gaming, hospitality, or related industries",
      "Strong understanding of Indigenous governance and culture",
      "MBA or equivalent advanced degree preferred",
      "Proven track record in strategic planning and execution",
      "Excellent communication and stakeholder management skills",
    ],
    benefits: [
      "Comprehensive health & dental benefits",
      "Pension plan with employer matching",
      "Professional development funding",
      "Relocation assistance available",
      "Cultural leave days",
    ],
    order: 1,
    createdAt: serverTimestamp(),
  },
  {
    id: "job-health-nurse-stc",
    type: "job" as const,
    title: "Community Health Nurse",
    orgId: "stc",
    orgName: "Saskatoon Tribal Council",
    orgShort: "STC",
    location: "Saskatoon, SK",
    jobType: "Full-time",
    salary: "$72K - $88K",
    source: "via STC Careers",
    badges: ["Verified"],
    description:
      "The Saskatoon Tribal Council is looking for a registered nurse to provide community health services across our member First Nations. You will deliver culturally safe primary care, health education, and disease prevention programs.\n\nThis role involves travel to communities and working closely with Elders, community health representatives, and other healthcare providers to improve health outcomes.",
    responsibilities: [
      "Provide primary care nursing services in community settings",
      "Deliver immunization, prenatal, and chronic disease programs",
      "Conduct community health assessments and screenings",
      "Collaborate with traditional healers and Elders",
      "Maintain accurate health records and reporting",
      "Mentor and support community health representatives",
    ],
    qualifications: [
      "Registered Nurse (RN) license in Saskatchewan",
      "2+ years of community or public health experience",
      "Cultural sensitivity training or experience with Indigenous communities",
      "Valid driver's license and willingness to travel",
      "CPR and First Aid certification",
    ],
    benefits: [
      "Northern living allowance",
      "Extended health & dental benefits",
      "Pension plan",
      "Professional development funding",
      "Cultural leave days",
    ],
    order: 2,
    createdAt: serverTimestamp(),
  },
  {
    id: "program-indigenous-business-fnuniv",
    type: "program" as const,
    title: "Indigenous Business Administration",
    orgId: "fnuniv",
    orgName: "First Nations University of Canada",
    orgShort: "FNUniv",
    location: "Regina, SK",
    duration: "4 Years",
    credential: "Bachelor's Degree",
    badges: ["Education Partner"],
    description:
      "A comprehensive business degree grounded in Indigenous values and worldviews. Students gain practical business skills while exploring Indigenous approaches to leadership, entrepreneurship, and economic development.",
    order: 3,
    createdAt: serverTimestamp(),
  },
  {
    id: "spotlight-siga",
    type: "spotlight" as const,
    title: "Saskatchewan Indian Gaming Authority",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    description:
      "Leading Indigenous employer in Saskatchewan with 12 open positions across 7 casino properties",
    order: 4,
    createdAt: serverTimestamp(),
  },
  {
    id: "event-batoche",
    type: "event" as const,
    title: "Back to Batoche Days",
    location: "Batoche National Historic Site, SK",
    dates: "Jul 18-20",
    price: "Free",
    eventType: "Pow Wow",
    organizer: "Métis Nation — Saskatchewan",
    description:
      "Back to Batoche Days is an annual gathering that brings together thousands of Métis and Indigenous peoples to celebrate their rich heritage, culture, and history at the Batoche National Historic Site.\n\nJoin us for three days of jigging, fiddle music, traditional games, storytelling, and community connection. This year's celebration marks a milestone with expanded programming for youth, new cultural workshops, and an evening concert series.",
    schedule: [
      { day: "Friday, July 18", items: ["Opening Ceremony — 10:00 AM", "Elders' Circle — 11:30 AM", "Jigging Competition — 2:00 PM", "Community Feast — 5:00 PM", "Evening Concert — 7:30 PM"] },
      { day: "Saturday, July 19", items: ["Sunrise Ceremony — 6:00 AM", "Cultural Workshops — 9:00 AM", "Traditional Games — 1:00 PM", "Fiddle Championship — 3:00 PM", "Round Dance — 8:00 PM"] },
      { day: "Sunday, July 20", items: ["Morning Prayer — 8:00 AM", "Youth Program Finals — 10:00 AM", "Closing Ceremony — 2:00 PM"] },
    ],
    highlights: [
      "Traditional jigging and fiddle competitions",
      "Cultural workshops and language sessions",
      "Traditional food and craft vendors",
      "Youth programming and mentorship",
      "Historical site tours and storytelling",
      "Community feast and round dance",
    ],
    order: 5,
    createdAt: serverTimestamp(),
  },
  {
    id: "story-sarah",
    type: "story" as const,
    title: "Sarah Whitebear",
    community: "Muskoday First Nation",
    quote: "Every step I took was for my community.",
    description:
      "Sarah went from community volunteer to SIGA's youngest regional manager, earning her business degree through FNUniv while working full-time.",
    order: 6,
    createdAt: serverTimestamp(),
  },
  {
    id: "job-youth-coordinator-mltc",
    type: "job" as const,
    title: "Youth Program Coordinator",
    orgName: "Meadow Lake Tribal Council",
    orgShort: "MLTC",
    location: "Meadow Lake, SK",
    jobType: "Contract",
    salary: "$48K - $55K",
    description:
      "Coordinate and deliver youth engagement programs across nine member First Nations. You will design culturally relevant programming, organize community events, and mentor young leaders.\n\nThis contract position runs for 12 months with the possibility of renewal based on funding.",
    responsibilities: [
      "Design and deliver youth programming across nine communities",
      "Organize sports, cultural, and leadership events",
      "Recruit and mentor youth volunteers and peer leaders",
      "Build partnerships with schools and community organizations",
      "Track program outcomes and prepare funding reports",
    ],
    qualifications: [
      "Diploma or degree in Social Work, Education, or related field",
      "Experience working with Indigenous youth",
      "Valid driver's license and access to a vehicle",
      "Strong event planning and organizational skills",
      "Knowledge of Cree or Dene language is an asset",
    ],
    benefits: [
      "Health & dental benefits",
      "Mileage reimbursement",
      "Professional development opportunities",
    ],
    order: 7,
    createdAt: serverTimestamp(),
  },
  {
    id: "job-surveillance-siga",
    type: "job" as const,
    title: "Surveillance Officer",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    location: "Saskatoon, SK",
    jobType: "Full-time",
    salary: "$45K - $52K",
    description:
      "Monitor casino floor activities using advanced surveillance systems to ensure the integrity and security of gaming operations. Work in a fast-paced environment protecting guests, staff, and company assets.",
    responsibilities: [
      "Monitor live and recorded video surveillance feeds",
      "Identify and report suspicious or irregular activities",
      "Prepare detailed incident reports and evidence documentation",
      "Coordinate with floor security and management teams",
      "Maintain surveillance equipment and recording systems",
    ],
    qualifications: [
      "High school diploma or equivalent",
      "Strong attention to detail and observation skills",
      "Ability to work rotating shifts including nights and weekends",
      "Clean criminal record check required",
      "Previous surveillance or security experience an asset",
    ],
    benefits: [
      "Health & dental benefits",
      "Pension plan",
      "Shift premiums",
      "Free meals on shift",
    ],
    order: 8,
    createdAt: serverTimestamp(),
  },
  {
    id: "job-table-games-siga",
    type: "job" as const,
    title: "Table Games Dealer",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    location: "Prince Albert, SK",
    jobType: "Full-time",
    salary: "$38K - $45K + tips",
    description:
      "Deal blackjack, poker, and other table games in a professional and friendly manner. Full paid training is provided — no prior dealing experience required.",
    responsibilities: [
      "Deal assigned table games following SIGA procedures",
      "Ensure fair play and accurate payouts",
      "Provide excellent customer service to guests",
      "Handle chips and cash transactions accurately",
      "Report any irregularities to pit supervisors",
    ],
    qualifications: [
      "19 years of age or older",
      "High school diploma or equivalent",
      "Strong math and communication skills",
      "Ability to stand for extended periods",
      "Flexible schedule including evenings and weekends",
    ],
    benefits: [
      "Paid training provided",
      "Health & dental benefits",
      "Pension plan",
      "Tip pool participation",
      "Free meals on shift",
    ],
    order: 9,
    createdAt: serverTimestamp(),
  },
  {
    id: "job-fb-manager-siga",
    type: "job" as const,
    title: "Food & Beverage Manager",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    location: "Saskatoon, SK",
    jobType: "Full-time",
    salary: "$62K - $75K",
    description:
      "Lead the food and beverage operations at one of SIGA's premier casino properties. Oversee restaurants, bars, banquet services, and kitchen operations to deliver exceptional dining experiences.",
    responsibilities: [
      "Manage daily food and beverage operations across multiple outlets",
      "Hire, train, and supervise kitchen and front-of-house staff",
      "Develop menus, pricing strategies, and promotional events",
      "Maintain health and safety compliance standards",
      "Control food costs, inventory, and waste management",
      "Coordinate banquet and special event services",
    ],
    qualifications: [
      "5+ years of food and beverage management experience",
      "Hospitality diploma or culinary arts certification",
      "Food safety certification (ServSafe or equivalent)",
      "Strong leadership and team-building skills",
      "Experience with inventory and cost management systems",
    ],
    benefits: [
      "Health & dental benefits",
      "Pension plan",
      "Performance bonuses",
      "Complimentary meals",
      "Professional development funding",
    ],
    order: 10,
    createdAt: serverTimestamp(),
  },
  {
    id: "job-it-support-siga",
    type: "job" as const,
    title: "IT Support Analyst",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    location: "Regina, SK",
    salary: "$55K - $65K",
    jobType: "Full-time",
    description:
      "Provide first and second-level technical support to SIGA staff across all casino properties. Troubleshoot hardware, software, and network issues while maintaining IT documentation and asset inventory.",
    responsibilities: [
      "Provide helpdesk support via phone, email, and in-person",
      "Troubleshoot hardware, software, and network issues",
      "Set up and configure workstations, printers, and mobile devices",
      "Maintain IT asset inventory and documentation",
      "Assist with system upgrades, patches, and deployments",
      "Support gaming systems and point-of-sale terminals",
    ],
    qualifications: [
      "Diploma or degree in Information Technology",
      "CompTIA A+ or equivalent certification preferred",
      "2+ years of IT support experience",
      "Experience with Windows, Active Directory, and Office 365",
      "Strong troubleshooting and problem-solving skills",
      "Willingness to travel between casino properties",
    ],
    benefits: [
      "Health & dental benefits",
      "Pension plan",
      "Professional development and certification funding",
      "Technology allowance",
    ],
    order: 11,
    createdAt: serverTimestamp(),
  },
  {
    id: "job-marketing-siga",
    type: "job" as const,
    title: "Marketing Coordinator",
    orgId: "siga",
    orgName: "Saskatchewan Indian Gaming Authority",
    orgShort: "SIGA",
    location: "Saskatoon, SK",
    jobType: "Full-time",
    salary: "$50K - $60K",
    description:
      "Support SIGA's marketing team in developing and executing campaigns that drive guest engagement across all seven casino properties. Create compelling content, manage social media channels, and coordinate promotional events.",
    responsibilities: [
      "Create content for social media, website, and print materials",
      "Coordinate marketing campaigns and promotional events",
      "Manage SIGA's social media presence and community engagement",
      "Track campaign performance and prepare analytics reports",
      "Collaborate with external agencies and vendors",
      "Support brand consistency across all properties",
    ],
    qualifications: [
      "Degree in Marketing, Communications, or related field",
      "2+ years of marketing or communications experience",
      "Proficiency in Adobe Creative Suite and social media platforms",
      "Strong writing and content creation skills",
      "Experience with analytics tools (Google Analytics, Meta Business)",
      "Knowledge of Indigenous communities and culture is an asset",
    ],
    benefits: [
      "Health & dental benefits",
      "Pension plan",
      "Professional development funding",
      "Flexible work arrangements",
    ],
    order: 12,
    createdAt: serverTimestamp(),
  },
  {
    id: "event-career-fair",
    type: "event" as const,
    title: "Treaty 6 Career Fair",
    location: "Saskatoon, SK",
    dates: "Aug 5",
    price: "Free",
    eventType: "Career Fair",
    organizer: "Treaty 6 Education Council",
    description:
      "Connect with over 30 employers actively hiring Indigenous talent at Saskatchewan's largest Treaty 6 career fair. Bring your resume, dress professionally, and be ready for on-the-spot interviews.\n\nEmployers include SIGA, STC, Cameco, Nutrien, and many more. Free resume reviews and interview coaching available on-site.",
    highlights: [
      "30+ employers with active job openings",
      "On-the-spot interviews and hiring",
      "Free professional resume reviews",
      "Interview coaching workshops",
      "Networking lunch provided",
      "Youth career exploration zone",
    ],
    order: 13,
    createdAt: serverTimestamp(),
  },
  {
    id: "event-round-dance",
    type: "event" as const,
    title: "Round Dance",
    location: "Prince Albert, SK",
    dates: "Mar 22",
    price: "Free",
    eventType: "Round Dance",
    organizer: "Prince Albert Grand Council",
    description:
      "A traditional Cree round dance ceremony celebrating community, healing, and togetherness. Everyone is welcome — come join the circle, share a meal, and experience the power of the drum.\n\nFeast at 5:00 PM, round dance begins at 7:00 PM. Dress warmly.",
    highlights: [
      "Traditional Cree drum groups",
      "Community feast at 5:00 PM",
      "All ages welcome",
      "Traditional giveaway",
    ],
    order: 14,
    createdAt: serverTimestamp(),
  },
  {
    id: "job-instructor-fnuniv",
    type: "job" as const,
    title: "Indigenous Studies Instructor",
    orgId: "fnuniv",
    orgName: "First Nations University of Canada",
    orgShort: "FNUniv",
    location: "Regina, SK",
    jobType: "Full-time",
    salary: "$68K - $82K",
    description:
      "Teach undergraduate Indigenous Studies courses including Treaty education, Indigenous governance, and land-based learning. Contribute to curriculum development and student mentorship within a culturally supportive academic environment.",
    responsibilities: [
      "Teach 3-4 undergraduate courses per semester",
      "Develop curriculum grounded in Indigenous knowledge systems",
      "Mentor and advise Indigenous students",
      "Contribute to department research initiatives",
      "Participate in cultural events and community engagement",
      "Serve on academic committees as needed",
    ],
    qualifications: [
      "Master's degree in Indigenous Studies or related field (PhD preferred)",
      "Teaching experience at the post-secondary level",
      "Knowledge of Treaty rights and Indigenous governance",
      "Connection to Indigenous communities and cultural practices",
      "Strong research and publication record is an asset",
    ],
    benefits: [
      "Comprehensive health & dental benefits",
      "Pension plan",
      "Sabbatical eligibility",
      "Professional development funding",
      "Tuition waiver for family members",
    ],
    order: 15,
    createdAt: serverTimestamp(),
  },
  {
    id: "job-recruitment-fnuniv",
    type: "job" as const,
    title: "Student Recruitment Coordinator",
    orgId: "fnuniv",
    orgName: "First Nations University of Canada",
    orgShort: "FNUniv",
    location: "Regina, SK",
    jobType: "Full-time",
    salary: "$45K - $55K",
    description:
      "Travel across Saskatchewan to recruit Indigenous students into FNUniv programs. Visit high schools, career fairs, and community events to share the FNUniv story and support prospective students through the application process.",
    responsibilities: [
      "Visit high schools and communities across Saskatchewan",
      "Present at career fairs, education expos, and community events",
      "Guide prospective students through application and funding processes",
      "Build relationships with school counselors and band education coordinators",
      "Coordinate campus tours and open house events",
      "Track recruitment metrics and prepare reports",
    ],
    qualifications: [
      "Degree or diploma in Education, Communications, or related field",
      "Experience working with Indigenous youth and communities",
      "Valid driver's license and willingness to travel extensively",
      "Excellent public speaking and presentation skills",
      "Knowledge of post-secondary funding and scholarship programs",
      "Fluency in Cree, Saulteaux, or Dakota is an asset",
    ],
    benefits: [
      "Health & dental benefits",
      "Pension plan",
      "Travel allowance and mileage reimbursement",
      "Professional development funding",
    ],
    order: 16,
    createdAt: serverTimestamp(),
  },
];

export default function SeedPage() {
  return (
    <AdminRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <SeedContent />
      </div>
    </AdminRoute>
  );
}

function SeedContent() {
  const { user } = useAuth();
  const [status, setStatus] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedingNotifs, setSeedingNotifs] = useState(false);

  const handleSeedNotifications = async () => {
    if (!user) return;
    setSeedingNotifs(true);
    setStatus("Seeding notifications...");
    try {
      const notifs = [
        {
          type: "welcome" as const,
          title: "Welcome to IOPPS!",
          body: "Your account is set up. Complete your profile to get personalized job and event recommendations.",
          link: "/profile",
        },
        {
          type: "job_match" as const,
          title: "New job match: Casino Host",
          body: "SIGA posted a Casino Host position in Saskatoon that matches your interests.",
          link: "/jobs/casino-host-siga",
        },
        {
          type: "event_reminder" as const,
          title: "Back to Batoche Days is coming up",
          body: "Don\u2019t miss the annual cultural celebration \u2014 Jul 18-20 at Batoche National Historic Site.",
          link: "/events/batoche",
        },
        {
          type: "new_post" as const,
          title: "FNUniv posted 2 new positions",
          body: "Indigenous Studies Instructor and Student Recruitment Coordinator roles are now open.",
          link: "/search",
        },
        {
          type: "system" as const,
          title: "IOPPS platform update",
          body: "We\u2019ve added dark mode, notifications, and profile photo uploads. Check out the new features!",
        },
      ];
      for (const n of notifs) {
        await addNotification(user.uid, n);
      }
      setStatus(`Done! Seeded ${notifs.length} notifications for your account.`);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSeedingNotifs(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setStatus("Seeding organizations...");
    try {
      for (const org of orgs) {
        const { id, ...data } = org;
        await setOrganization(id, data);
      }
      setStatus(`Seeded ${orgs.length} organizations. Seeding posts...`);

      for (const post of posts) {
        const { id, ...data } = post;
        await setPost(id, data);
      }
      setStatus(
        `Done! Seeded ${orgs.length} organizations and ${posts.length} posts.`
      );
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto px-4 py-8">
      <h2 className="text-2xl font-extrabold text-text mb-2">Seed Database</h2>
      <p className="text-sm text-text-sec mb-6">
        Populate Firestore with demo organizations and posts.
      </p>

      <Card style={{ padding: 20 }}>
        <p className="text-sm text-text-sec mb-1">
          <strong>{orgs.length}</strong> organizations &bull;{" "}
          <strong>{posts.length}</strong> posts
        </p>
        <p className="text-xs text-text-muted mb-4">
          This will overwrite existing documents with the same IDs.
        </p>

        <Button
          primary
          onClick={handleSeed}
          style={{
            background: "var(--teal)",
            borderRadius: 14,
            padding: "12px 24px",
            opacity: seeding ? 0.7 : 1,
          }}
        >
          {seeding ? "Seeding..." : "Seed Database"}
        </Button>

        {status && (
          <p className="text-sm text-teal mt-4 font-medium">{status}</p>
        )}
      </Card>

      <Card style={{ padding: 20 }} className="mt-4">
        <p className="text-sm text-text-sec mb-1">
          <strong>Sample Notifications</strong>
        </p>
        <p className="text-xs text-text-muted mb-4">
          Creates 5 sample notifications for your account (welcome, job match, event reminder, etc.)
        </p>
        <Button
          primary
          onClick={handleSeedNotifications}
          style={{
            background: "var(--purple)",
            borderRadius: 14,
            padding: "12px 24px",
            opacity: seedingNotifs ? 0.7 : 1,
          }}
        >
          {seedingNotifs ? "Seeding..." : "Seed Notifications"}
        </Button>
      </Card>
    </div>
  );
}
