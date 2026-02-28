// Shared signup wizard styles and constants

export const INSTITUTION_TYPES = [
  { value: "university", label: "University" },
  { value: "college", label: "College" },
  { value: "polytechnic", label: "Polytechnic" },
  { value: "tribal_college", label: "Tribal College" },
  { value: "training_provider", label: "Training Provider" },
];

export const PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
  "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon",
];

export const INDIGENOUS_SERVICES = [
  { id: "student_centre", icon: "\ud83c\udfe0", label: "Indigenous Student Centre" },
  { id: "elder", icon: "\ud83e\udeb6", label: "Elder in Residence" },
  { id: "cultural", icon: "\ud83c\udfad", label: "Cultural Programs" },
  { id: "language", icon: "\ud83d\udde3\ufe0f", label: "Language Programs" },
  { id: "academic", icon: "\ud83d\udcda", label: "Academic Coaches" },
  { id: "wellness", icon: "\ud83d\udc9a", label: "Wellness Programs" },
  { id: "ceremony", icon: "\ud83d\udd25", label: "Ceremony Space" },
  { id: "community", icon: "\ud83e\udd1d", label: "Community Supports" },
];

export const EMPLOYER_CAPABILITIES = [
  { id: "post_jobs", icon: "\ud83d\udcbc", label: "Post Jobs" },
  { id: "list_business", icon: "\ud83c\udfea", label: "List Business" },
  { id: "host_events", icon: "\ud83d\udcc5", label: "Host Events" },
  { id: "post_grants", icon: "\ud83d\udcb0", label: "Post Grants" },
];

export const CSS = {
  bg: "#020617",
  card: "#0D1224",
  cardHover: "#111936",
  border: "rgba(51,65,85,0.5)",
  borderLight: "rgba(51,65,85,0.3)",
  accent: "#14B8A6",
  accentLight: "rgba(20,184,166,0.15)",
  accentGlow: "rgba(20,184,166,0.3)",
  blue: "#0EA5E9",
  purple: "#A78BFA",
  amber: "#F59E0B",
  rose: "#F43F5E",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  success: "#22c55e",
  error: "#ef4444",
} as const;