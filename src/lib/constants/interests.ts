export const interestOptions = [
  { id: "jobs", icon: "\u{1F4BC}", label: "Jobs & Careers", desc: "Job postings & career resources" },
  { id: "events", icon: "\u{1FAB6}", label: "Events & Pow Wows", desc: "Community gatherings & fairs" },
  { id: "scholarships", icon: "\u{1F393}", label: "Scholarships & Grants", desc: "Funding opportunities" },
  { id: "businesses", icon: "\u{1F3EA}", label: "Indigenous Businesses", desc: "Shop & support local" },
  { id: "schools", icon: "\u{1F4DA}", label: "Schools & Programs", desc: "Education & training" },
  { id: "livestreams", icon: "\u{1F4FA}", label: "Livestreams & Stories", desc: "Live content & spotlights" },
] as const;

export const interestLabels: Record<string, { icon: string; label: string }> =
  Object.fromEntries(
    interestOptions.map((o) => [o.id, { icon: o.icon, label: o.label }])
  );
