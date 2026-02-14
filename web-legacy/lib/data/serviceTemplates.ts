// Service Templates for quick service creation
// Templates pre-fill common service types to reduce form friction

import type { ServiceCategory } from "@/lib/types";

export interface ServiceTemplate {
  id: string;
  name: string;
  category: ServiceCategory;
  title: string;
  description: string;
  industries?: string[];
  servesRemote?: boolean;
}

// Template definitions - staged for future release
// When enabled, these will appear in a dropdown at the top of the service form
export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  // Templates will be added in a future iteration
  // Example structure:
  // {
  //   id: "junk-removal",
  //   name: "Junk Removal & Hauling",
  //   category: "Construction & Trades",
  //   title: "Junk Removal & Hauling Services",
  //   description: "Professional junk removal, hauling, and disposal services...",
  //   industries: ["Residential", "Commercial", "Construction"],
  //   servesRemote: false,
  // },
];

// Future templates to be added:
// - Junk Removal & Hauling
// - Moving Help
// - Snow Removal
// - Lawn Care
// - Catering
// - DJ / Audio
// - Photo / Video
// - Consulting / Coaching
// - Construction / Renovation
// - Bookkeeping / Admin

export function getTemplateById(id: string): ServiceTemplate | undefined {
  return SERVICE_TEMPLATES.find((t) => t.id === id);
}
