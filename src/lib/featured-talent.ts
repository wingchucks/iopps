export type FeaturedTalentProfile = {
  slug: string;
  name: string;
  featuredLabel: string;
  headline: string;
  nation: string;
  location: string;
  openTo: string;
  imageUrl: string;
  publicEmail: string;
  summary: string;
  skills: string[];
  experience: string[];
};

export const featuredTalentProfiles: FeaturedTalentProfile[] = [
  {
    slug: "audrey-fiddler",
    name: "Audrey Fiddler",
    featuredLabel: "Featured Talent",
    headline: "Administrative, training, and community project support",
    nation: "Waterhen Lake First Nation",
    location: "Saskatchewan • Open to relocation",
    openTo: "Seeking full-time employment",
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
  },
];

export function getFeaturedTalentProfile(slug: string) {
  return featuredTalentProfiles.find((profile) => profile.slug === slug) ?? null;
}
