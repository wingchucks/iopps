export type FeaturedTalentProfile = {
  slug: string;
  name: string;
  nation: string;
  location: string;
  headline: string;
  status: string;
  imageUrl: string;
  email: string;
  bio: string;
  lookingFor: string[];
  skills: string[];
  strengths: string[];
  featuredLabel: string;
};

export const featuredTalentProfiles: FeaturedTalentProfile[] = [
  {
    slug: "audrey-fiddler",
    name: "Audrey Fiddler",
    nation: "Waterhen Lake First Nation",
    location: "Saskatchewan • Open to relocation",
    headline: "Health, administration, employment and training professional",
    status: "Seeking full-time employment",
    imageUrl: "/featured-talent/audrey-fiddler.jpeg",
    email: "audreylynnefiddler@outlook.com",
    bio: "Audrey is a member of Waterhen Lake First Nation with experience in health, business administration, employment and training, social administration, and leadership. She is known for building professional relationships with colleagues, staff, clients, and communities while supporting projects that help communities and organizations succeed.",
    lookingFor: [
      "Full-time employment",
      "Health, administration, or community-focused roles",
      "Surrounding areas or relocation for the right opportunity",
    ],
    skills: [
      "Leadership",
      "Business administration",
      "Employment and training",
      "Social administration",
      "Community projects",
      "Relationship-building",
    ],
    strengths: [
      "Professional communication",
      "Staff and client support",
      "Community relationship-building",
      "Business and project coordination",
    ],
    featuredLabel: "Featured Talent",
  },
];

export function getFeaturedTalentProfile(slug: string) {
  return featuredTalentProfiles.find((profile) => profile.slug === slug) ?? null;
}
