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
  isActive: boolean;
};

// Photos under public/featured-talent/ are served whatever isActive says, so a
// deactivated profile's photo is removed along with it.
export const featuredTalentProfiles: FeaturedTalentProfile[] = [];

/** Profiles that may be shown publicly; a deactivated profile is never built or served. */
export function getActiveFeaturedTalentProfiles(): FeaturedTalentProfile[] {
  return featuredTalentProfiles.filter((profile) => profile.isActive);
}

export function getFeaturedTalentProfile(slug: string) {
  return getActiveFeaturedTalentProfiles().find((profile) => profile.slug === slug) ?? null;
}
