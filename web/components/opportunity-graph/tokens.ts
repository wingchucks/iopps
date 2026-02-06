/**
 * IOPPS Social Opportunity Graph — Design Tokens
 * 
 * Light theme with Indigenous-inspired accent colors.
 * Teal (#0D9488) as primary accent, navy (#0F172A) for depth.
 */

export const colors = {
  // Core
  bg: "#F8FAFC",           // slate-50 — page background
  surface: "#FFFFFF",       // cards, modals
  text: "#0F172A",          // slate-900 — primary text
  textMd: "#334155",        // slate-700
  textSoft: "#64748B",      // slate-500
  textMuted: "#94A3B8",     // slate-400
  textFaint: "#CBD5E1",     // slate-300

  // Borders
  border: "#E2E8F0",        // slate-200
  borderLt: "#F1F5F9",      // slate-100

  // Primary Accent — Teal
  accent: "#0D9488",        // teal-600
  accentDk: "#0F766E",      // teal-700
  accentDp: "#115E59",      // teal-800
  accentLt: "#5EEAD4",      // teal-300
  accentBg: "#F0FDFA",      // teal-50

  // Secondary Colors
  navy: "#0F172A",          // slate-900
  blue: "#3B82F6",
  blueBg: "#EFF6FF",
  purple: "#8B5CF6",
  purpleBg: "#F5F3FF",
  pink: "#EC4899",
  pinkBg: "#FDF2F8",
  amber: "#F59E0B",
  amberBg: "#FFFBEB",
  orange: "#F97316",
  orangeBg: "#FFF7ED",
  cyan: "#06B6D4",
  cyanBg: "#ECFEFF",

  // Semantic
  red: "#DC2626",
  redBg: "#FEF2F2",
  green: "#16A34A",
  greenBg: "#F0FDF4",
} as const;

export type ColorKey = keyof typeof colors;

// Type configuration for different opportunity types
export const typeConfig = {
  job: {
    emoji: "💼",
    color: colors.accent,
    bg: colors.accentBg,
    label: "Job",
    cta: "Apply Now",
    ctaIcon: "arrow",
  },
  program: {
    emoji: "🎓",
    color: colors.blue,
    bg: colors.blueBg,
    label: "Program",
    cta: "Learn More",
    ctaIcon: "arrow",
  },
  scholarship: {
    emoji: "🏆",
    color: colors.amber,
    bg: colors.amberBg,
    label: "Scholarship",
    cta: "Learn More",
    ctaIcon: "arrow",
  },
  event: {
    emoji: "📅",
    color: colors.purple,
    bg: colors.purpleBg,
    label: "Event",
    cta: "Register",
    ctaIcon: "calendar",
  },
  conference: {
    emoji: "🎤",
    color: colors.pink,
    bg: colors.pinkBg,
    label: "Conference",
    cta: "Register",
    ctaIcon: "calendar",
  },
  product: {
    emoji: "🛍",
    color: colors.orange,
    bg: colors.orangeBg,
    label: "Shop",
    cta: "Visit Shop",
    ctaIcon: "external",
  },
  service: {
    emoji: "⚡",
    color: colors.cyan,
    bg: colors.cyanBg,
    label: "Service",
    cta: "Learn More",
    ctaIcon: "arrow",
  },
  livestream: {
    emoji: "🎥",
    color: colors.red,
    bg: colors.redBg,
    label: "Live",
    cta: "Join Live",
    ctaIcon: "video",
  },
  update: {
    emoji: "👤",
    color: colors.green,
    bg: colors.greenBg,
    label: "Update",
    cta: null,
  },
} as const;

export type OpportunityType = keyof typeof typeConfig;
