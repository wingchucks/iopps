export type FeaturedTalentStatus = "draft" | "review" | "approved" | "featured" | "archived";

export type FeaturedTalentCategory =
  | "Open to Work"
  | "Student"
  | "Entrepreneur"
  | "Artist"
  | "Community Leader";

export type FeaturedTalentSocialShare = {
  shortCaption: string;
  longCaption: string;
  hashtags: string[];
};

export type FeaturedTalentAdminControls = {
  status: FeaturedTalentStatus;
  showOnHomepage: boolean;
  allowSocialShare: boolean;
  reviewedBy: string;
  reviewNote: string;
};

export type FeaturedTalentProfile = {
  slug: string;
  name: string;
  featuredLabel: string;
  headline: string;
  nation: string;
  location: string;
  openTo: string;
  category: FeaturedTalentCategory;
  imageUrl: string;
  publicEmail: string;
  summary: string;
  skills: string[];
  experience: string[];
  idealRoles: string[];
  adminControls: FeaturedTalentAdminControls;
  socialShare: FeaturedTalentSocialShare;
};

export const featuredTalentCategories: FeaturedTalentCategory[] = [
  "Open to Work",
  "Student",
  "Entrepreneur",
  "Artist",
  "Community Leader",
];

export const featuredTalentProfiles: FeaturedTalentProfile[] = [
  {
    slug: "audrey-fiddler",
    name: "Audrey Fiddler",
    featuredLabel: "Featured Talent",
    headline: "Administrative, training, and community project support",
    nation: "Waterhen Lake First Nation",
    location: "Saskatchewan • Open to relocation",
    openTo: "Seeking full-time employment",
    category: "Open to Work",
    imageUrl: "/featured-talent/audrey-fiddler.jpeg",
    publicEmail: "audreylynnefiddler@outlook.com",
    summary:
      "Audrey brings experience across office administration, employment and training support, community projects, and client service. She is ready for a full-time role where she can contribute strong organization, communication, and people-first support.",
    skills: [
      "Administrative support",
      "Employment and training",
      "Community projects",
      "Client service",
      "Business administration",
      "Leadership",
    ],
    experience: [
      "Office and administrative coordination",
      "Employment, training, and participant support",
      "Community-focused programming and project work",
      "Customer service and front-line communication",
    ],
    idealRoles: [
      "Administration and office support",
      "Employment and training programs",
      "Community project coordination",
      "Client service and front desk leadership",
    ],
    adminControls: {
      status: "featured",
      showOnHomepage: true,
      allowSocialShare: true,
      reviewedBy: "IOPPS team",
      reviewNote: "Approved public Featured Talent profile. Email-only public contact.",
    },
    socialShare: {
      shortCaption:
        "Meet Audrey Fiddler, IOPPS Featured Talent. Audrey is open to full-time opportunities in administration, employment and training, and community support.",
      longCaption:
        "Tansi everyone! Meet Audrey Fiddler, IOPPS Featured Talent. Audrey brings experience in administration, employment and training support, community projects, and client service. View her public profile on IOPPS.ca and share with employers or organizations looking for people-first support.",
      hashtags: ["IOPPS", "FeaturedTalent", "IndigenousSuccess", "OpenToWork"],
    },
  },
];

export function getFeaturedTalentProfile(slug: string) {
  return featuredTalentProfiles.find((profile) => profile.slug === slug) ?? null;
}

export function getHomepageFeaturedTalent() {
  return featuredTalentProfiles.find((profile) => profile.adminControls.showOnHomepage) ?? featuredTalentProfiles[0];
}

export function getFeaturedTalentByStatus(status: FeaturedTalentStatus) {
  return featuredTalentProfiles.filter((profile) => profile.adminControls.status === status);
}
