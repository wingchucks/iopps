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
    slug: "lauren-moosuk",
    name: "Lauren Moosuk",
    featuredLabel: "Featured Talent",
    headline: "Support work, mental health, and wellness",
    nation: "Mosquito Grizzly Bear’s Head Lean Man First Nation • Nakota",
    location: "North Battleford",
    openTo: "Seeking wellness and support work opportunities",
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/iopps-c2224.firebasestorage.app/o/avatars%2Fzks536DFxVMNQ7cYiRMaT7T3A9T2%2Fprofile.jpg?alt=media&token=fd37b251-8c65-4f55-ac8b-e84c9bfb231d",
    publicEmail: "laurenmoosuk70@gmail.com",
    summary:
      "Lauren Moosuk is passionate about mental health, wellness, and community care. She is seeking employment in the wellness field where she can contribute compassion, cultural understanding, lived experience, and a strong commitment to helping individuals and communities thrive.",
    skills: [
      "Mental health and wellness",
      "Support services",
      "Community care",
      "Cultural understanding",
      "Safe and inclusive spaces",
      "Compassionate support",
    ],
    experience: [
      "Mental health and wellness support services",
      "Community care and people-first support",
      "Culturally respectful and inclusive spaces",
      "Helping individuals and communities build resilience and well-being",
    ],
  },
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
