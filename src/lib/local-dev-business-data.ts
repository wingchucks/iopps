import { normalizeOrganizationRecord } from "@/lib/organization-profile";

const localDevOrgBase = {
  id: "org-local-northern-lights",
  slug: "northern-lights-indigenous-consulting",
  name: "Northern Lights Indigenous Consulting",
  shortName: "Northern Lights",
  type: "employer" as const,
  description:
    "Northern Lights Indigenous Consulting partners with First Nations, Métis, and Inuit organizations to build hiring pathways, workforce strategy, and community-led business growth.",
  tagline: "Community-rooted workforce strategy and Indigenous partnership support.",
  foundedYear: 2004,
  industry: "Professional Services",
  size: "11-50",
  location: { city: "Saskatoon", province: "Saskatchewan" },
  address: "245 River Landing Way, Saskatoon, Saskatchewan",
  website: "northernlightsconsulting.ca",
  contactEmail: "hello@northernlightsconsulting.ca",
  phone: "(306) 555-0188",
  logoUrl: "/logo.png",
  bannerUrl: "/og-image.jpg",
  gallery: ["/og-image.jpg", "/logo.png"],
  tags: ["Recruitment", "Training", "First Nations"],
  services: ["Hiring", "Training", "Community Partnerships"],
  indigenousGroups: ["Métis"],
  nation: "Métis Nation-Saskatchewan",
  treatyTerritory: "Treaty 6",
  hours: {
    monday: { open: "9:00 AM", close: "5:00 PM", isOpen: true },
    tuesday: { open: "9:00 AM", close: "5:00 PM", isOpen: true },
    wednesday: { open: "9:00 AM", close: "5:00 PM", isOpen: true },
    thursday: { open: "9:00 AM", close: "5:00 PM", isOpen: true },
    friday: { open: "9:00 AM", close: "4:00 PM", isOpen: true },
    saturday: { open: "", close: "", isOpen: false },
    sunday: { open: "", close: "", isOpen: false },
  },
  verified: true,
  onboardingComplete: true,
  plan: "premium",
  subscriptionTier: "premium",
  subscriptionStatus: "active",
  isPartner: true,
  partnerTier: "premium" as const,
  partnerLabel: "Premium Partner",
  partnerBadgeLabel: "Premium Partner",
  partnerSection: "premium" as const,
  promotionWeight: 320,
  openJobs: 1,
  ownerType: "business" as const,
};

export const LOCAL_DEV_ORGANIZATION = normalizeOrganizationRecord(localDevOrgBase);

export const LOCAL_DEV_ORGANIZATIONS = [LOCAL_DEV_ORGANIZATION];

export function getLocalDevOrganizations(partnersOnly = false) {
  return partnersOnly
    ? LOCAL_DEV_ORGANIZATIONS.filter((org) => org.isPartner)
    : LOCAL_DEV_ORGANIZATIONS;
}

export function getLocalDevOrganizationPayload(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();
  if (
    normalizedSlug !== LOCAL_DEV_ORGANIZATION.slug &&
    normalizedSlug !== LOCAL_DEV_ORGANIZATION.id
  ) {
    return null;
  }

  return {
    org: LOCAL_DEV_ORGANIZATION,
    jobs: [
      {
        id: "job-local-partnerships-manager",
        slug: "community-partnerships-manager",
        title: "Community Partnerships Manager",
        description:
          "Lead Indigenous workforce partnerships, employer outreach, and community engagement programs across Saskatchewan.",
        location: "Saskatoon, Saskatchewan",
        employmentType: "Full-time",
        employerId: LOCAL_DEV_ORGANIZATION.id,
        employerName: LOCAL_DEV_ORGANIZATION.name,
        status: "active",
        active: true,
        featured: true,
        href: "/jobs/community-partnerships-manager",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    events: [
      {
        id: "event-local-leadership-forum",
        title: "Indigenous Leadership Hiring Forum",
        employerId: LOCAL_DEV_ORGANIZATION.id,
        orgId: LOCAL_DEV_ORGANIZATION.id,
        organizerName: LOCAL_DEV_ORGANIZATION.name,
        eventType: "Career Fair",
        date: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString(),
        location: "Saskatoon, Saskatchewan",
        status: "active",
        href: "/events/event-local-leadership-forum",
      },
    ],
    scholarships: [
      {
        id: "scholarship-local-futures-fund",
        title: "Northern Lights Futures Fund",
        employerId: LOCAL_DEV_ORGANIZATION.id,
        orgId: LOCAL_DEV_ORGANIZATION.id,
        organization: LOCAL_DEV_ORGANIZATION.name,
        amount: 2500,
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        description:
          "Annual support for Indigenous students pursuing business, HR, and community development studies.",
        status: "active",
        href: "/scholarships/scholarship-local-futures-fund",
      },
    ],
    training: [
      {
        id: "training-local-workforce-certificate",
        title: "Workforce Partnership Certificate",
        orgId: LOCAL_DEV_ORGANIZATION.id,
        orgName: LOCAL_DEV_ORGANIZATION.name,
        provider: LOCAL_DEV_ORGANIZATION.name,
        duration: "12 weeks",
        credential: "Certificate",
        campus: "Hybrid",
        location: "Saskatoon, Saskatchewan",
        active: true,
        href: "/training/training-local-workforce-certificate",
      },
    ],
  };
}
