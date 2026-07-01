export type EntrepreneurRegionSlug = "national" | "alberta" | "saskatchewan" | "manitoba" | "british-columbia" | "ontario";

export type EntrepreneurSupportCategory =
  | "Funding & Loans"
  | "Grants"
  | "Training"
  | "Mentorship"
  | "Startup Basics"
  | "Procurement"
  | "Youth Entrepreneurship"
  | "Women Entrepreneurs"
  | "Community Economic Development";

export interface EntrepreneurRegion {
  slug: EntrepreneurRegionSlug;
  name: string;
  eyebrow: string;
  description: string;
  firstSteps: string[];
}

export interface EntrepreneurResourcePartner {
  slug: string;
  name: string;
  shortName: string;
  regionSlugs: EntrepreneurRegionSlug[];
  categories: EntrepreneurSupportCategory[];
  summary: string;
  description: string;
  website: string;
  contactEmail?: string;
  phone?: string;
  bookingUrl?: string;
  partnerLabel: string;
  eligibility: string[];
  services: string[];
  programs: string[];
  notes?: string;
}

export interface EntrepreneurAwarenessCampaignPackage {
  name: string;
  priceLabel: string;
  termLabel: string;
  invoiceSplit: string;
  positioning: string;
  clarityNotes: string[];
  includedDeliverables: { label: string; quantity: string; detail: string }[];
  exclusions: string[];
}

export const entrepreneurRegions: EntrepreneurRegion[] = [
  {
    slug: "national",
    name: "National Supports",
    eyebrow: "Start here if you serve or operate across Canada",
    description:
      "A growing guide to Canada-wide Indigenous entrepreneur supports, procurement pathways, business development programs, and organizations that can point founders in the right direction.",
    firstSteps: [
      "Choose your province or territory so you can find the right local contact.",
      "Identify whether you need startup basics, financing, training, procurement support, or mentorship.",
      "Contact the official organization directly for eligibility, deadlines, and application rules.",
    ],
  },
  {
    slug: "alberta",
    name: "Alberta",
    eyebrow: "Financing, youth, women entrepreneur, and business development supports",
    description:
      "Find Alberta-focused Indigenous entrepreneur resources including financing, training, youth entrepreneur supports, women entrepreneur supports, mentorship, and business development contacts.",
    firstSteps: [
      "Review AIIC's Indigenous Youth Entrepreneur and Indigenous Women Entrepreneur supports.",
      "Book a conversation with the official program contact before assuming eligibility.",
      "Bring your business idea, stage, community, and financing/training questions to the first conversation.",
    ],
  },
  {
    slug: "saskatchewan",
    name: "Saskatchewan",
    eyebrow: "Coming next for IOPPS' home-region entrepreneur resource guide",
    description:
      "A Saskatchewan entrepreneur support page for financing, training, community economic development, and procurement resources. IOPPS will add verified partners as they are approved.",
    firstSteps: [
      "Use the national supports while Saskatchewan resources are being verified.",
      "Send missing Saskatchewan Indigenous entrepreneur resources to IOPPS for review.",
      "Watch for future Saskatchewan partner profiles and resource cards.",
    ],
  },
  {
    slug: "manitoba",
    name: "Manitoba",
    eyebrow: "Verified resource inventory planned",
    description: "A placeholder region for future verified Manitoba Indigenous entrepreneur supports.",
    firstSteps: ["Use the national supports for now.", "Send verified Manitoba entrepreneur resources to IOPPS for review."],
  },
  {
    slug: "british-columbia",
    name: "British Columbia",
    eyebrow: "Verified resource inventory planned",
    description: "A placeholder region for future verified British Columbia Indigenous entrepreneur supports.",
    firstSteps: ["Use the national supports for now.", "Send verified BC entrepreneur resources to IOPPS for review."],
  },
  {
    slug: "ontario",
    name: "Ontario",
    eyebrow: "Verified resource inventory planned",
    description: "A placeholder region for future verified Ontario Indigenous entrepreneur supports.",
    firstSteps: ["Use the national supports for now.", "Send verified Ontario entrepreneur resources to IOPPS for review."],
  },
];

export const entrepreneurCategories: EntrepreneurSupportCategory[] = [
  "Funding & Loans",
  "Grants",
  "Training",
  "Mentorship",
  "Startup Basics",
  "Procurement",
  "Youth Entrepreneurship",
  "Women Entrepreneurs",
  "Community Economic Development",
];

export const entrepreneurPartners: EntrepreneurResourcePartner[] = [
  {
    slug: "aiic",
    name: "Alberta Indian Investment Corporation",
    shortName: "AIIC",
    regionSlugs: ["alberta"],
    categories: [
      "Funding & Loans",
      "Training",
      "Mentorship",
      "Youth Entrepreneurship",
      "Women Entrepreneurs",
      "Community Economic Development",
    ],
    summary:
      "AIIC supports Indigenous entrepreneurs in Alberta with financing, training, and business development resources.",
    description:
      "Alberta Indian Investment Corporation works with Indigenous entrepreneurs and business owners in Alberta through financing, training, and business development supports. IOPPS is positioning AIIC as an Alberta resource partner for entrepreneurs looking for a clear place to start.",
    website: "https://www.aiicbusiness.org/",
    contactEmail: "youth@aiicbusiness.org",
    phone: "780.470.3600",
    bookingUrl: "https://calendly.com/youth-aiicbusiness",
    partnerLabel: "Alberta Resource Partner",
    eligibility: [
      "Indigenous entrepreneurs and business owners in Alberta",
      "Youth entrepreneur inquiries through AIIC's youth entrepreneur contact",
      "Women entrepreneur inquiries through AIIC's Indigenous Women's Entrepreneur Program",
      "Eligibility and program decisions must be confirmed directly with AIIC",
    ],
    services: [
      "Business financing conversations",
      "Training and business development direction",
      "Youth entrepreneur support pathways",
      "Women entrepreneur support pathways",
      "Referrals to official AIIC program contacts",
    ],
    programs: ["IYE — Indigenous Youth Entrepreneurs", "IWE — Indigenous Women Entrepreneurs", "SEAP / AIIC program information, pending AIIC approval"],
    notes:
      "AIIC program details, eligibility, and application decisions remain with AIIC. IOPPS promotes awareness and directs entrepreneurs to official AIIC channels.",
  },
];

export const aiicAwarenessCampaignPackage: EntrepreneurAwarenessCampaignPackage = {
  name: "AIIC Entrepreneur Awareness Campaign",
  priceLabel: "$7,500 + GST",
  termLabel: "12-month custom annual awareness contract",
  invoiceSplit: "50% IWE / 50% IYE",
  positioning:
    "A custom annual awareness contract — not the public IOPPS Premium jobs plan and not unlimited program posting — to promote AIIC's entrepreneur supports through IOPPS.ca, social/community channels, interview content, and reporting.",
  clarityNotes: [
    "This is separate from IOPPS public job and program posting plans.",
    "The $2,500 Premium IOPPS plan is for job postings, not unlimited program postings.",
    "This custom annual awareness contract promotes AIIC's services; it does not provide unlimited self-serve posting access.",
    "Additional paid ads, boosts, major video production, travel, or extra Pow Wow Trail sponsorships are quoted separately.",
  ],
  includedDeliverables: [
    {
      label: "Dedicated AIIC resource profile",
      quantity: "1 profile",
      detail: "A public IOPPS profile explaining AIIC, IYE, IWE, services, eligibility notes, and official contact/booking links.",
    },
    {
      label: "Alberta entrepreneur support placement",
      quantity: "1 featured placement",
      detail: "AIIC appears as a key Alberta resource under funding, youth, women entrepreneur, training, and business development categories.",
    },
    {
      label: "Monthly organic social/community promotion",
      quantity: "up to 12 months",
      detail: "One AIIC-focused post/graphic plus one entrepreneur-support mention each month, routed to IOPPS.ca and AIIC official links.",
    },
    {
      label: "Larger entrepreneur awareness pushes",
      quantity: "2 per year",
      detail: "Two campaign windows such as youth entrepreneur support, women entrepreneur support, or financing/business development awareness.",
    },
    {
      label: "Interview / feature package",
      quantity: "1 per year",
      detail: "One AIIC interview or Q&A feature, article/summary, and short social assets where source footage/content supports it.",
    },
    {
      label: "Pow Wow Trail segment opportunity",
      quantity: "1 per year",
      detail: "One sponsor-style community segment connected to entrepreneurs, youth, women, or community economic development.",
    },
    {
      label: "Monthly reporting",
      quantity: "12 reports",
      detail: "Plain-language reporting on page views, clicks, posts published, engagement where available, and recommendations.",
    },
    {
      label: "Quarterly planning review",
      quantity: "up to 4 reviews",
      detail: "Light planning/check-in cadence to choose messages and keep the campaign moving without unlimited revision cycles.",
    },
  ],
  exclusions: [
    "Does not include unlimited job postings.",
    "Does not include unlimited program postings.",
    "Does not include paid ads or boosts unless separately approved and funded.",
    "Does not include unlimited graphic design, video production, event coverage, or travel.",
    "Does not include grant writing, financial advice, or AIIC application processing.",
  ],
};

export function getEntrepreneurRegion(slug: string): EntrepreneurRegion | undefined {
  return entrepreneurRegions.find((region) => region.slug === slug);
}

export function getEntrepreneurPartner(slug: string): EntrepreneurResourcePartner | undefined {
  return entrepreneurPartners.find((partner) => partner.slug === slug);
}

export function getPartnersForRegion(slug: EntrepreneurRegionSlug): EntrepreneurResourcePartner[] {
  return entrepreneurPartners.filter((partner) => partner.regionSlugs.includes(slug));
}
