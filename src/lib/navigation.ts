export type NavigationAudience = "public" | "member";
export type NavigationIconName =
  | "home"
  | "video"
  | "briefcase"
  | "calendar"
  | "award"
  | "book"
  | "school"
  | "store"
  | "shield"
  | "search"
  | "users"
  | "bookmark"
  | "bell"
  | "settings"
  | "dashboard"
  | "tag";

type NavHref = string | { public: string; member: string };

interface NavItemDefinition {
  key: string;
  label: string;
  href: NavHref;
  icon?: NavigationIconName;
  dot?: boolean;
  priority: number;
}

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon?: NavigationIconName;
  dot?: boolean;
  priority: number;
}

const NAV_ITEM_DEFINITIONS = {
  home: {
    key: "home",
    label: "Home",
    href: { public: "/", member: "/feed" },
    icon: "home",
    priority: 10,
  },
  live: {
    key: "live",
    label: "Live",
    href: "/livestreams",
    icon: "video",
    dot: true,
    priority: 20,
  },
  jobs: {
    key: "jobs",
    label: "Jobs",
    href: "/jobs",
    icon: "briefcase",
    priority: 30,
  },
  events: {
    key: "events",
    label: "Events",
    href: "/events",
    icon: "calendar",
    priority: 40,
  },
  scholarships: {
    key: "scholarships",
    label: "Scholarships",
    href: "/scholarships",
    icon: "award",
    priority: 50,
  },
  training: {
    key: "training",
    label: "Training",
    href: "/training",
    icon: "book",
    priority: 60,
  },
  schools: {
    key: "schools",
    label: "Schools",
    href: "/schools",
    icon: "school",
    priority: 70,
  },
  businesses: {
    key: "businesses",
    label: "Businesses",
    href: "/businesses",
    icon: "store",
    priority: 80,
  },
  partners: {
    key: "partners",
    label: "Partners",
    href: "/partners",
    icon: "shield",
    priority: 90,
  },
  search: {
    key: "search",
    label: "Search",
    href: "/search",
    icon: "search",
    priority: 100,
  },
  members: {
    key: "members",
    label: "Members",
    href: "/members",
    icon: "users",
    priority: 110,
  },
  pricing: {
    key: "pricing",
    label: "Pricing",
    href: "/pricing",
    icon: "tag",
    priority: 130,
  },
  saved: {
    key: "saved",
    label: "Saved",
    href: "/saved",
    icon: "bookmark",
    priority: 140,
  },
  notifications: {
    key: "notifications",
    label: "Notifications",
    href: "/notifications",
    icon: "bell",
    priority: 150,
  },
  settings: {
    key: "settings",
    label: "Settings",
    href: "/settings",
    icon: "settings",
    priority: 160,
  },
  dashboard: {
    key: "dashboard",
    label: "Dashboard",
    href: "/org/dashboard",
    icon: "dashboard",
    priority: 170,
  },
  admin: {
    key: "admin",
    label: "Admin",
    href: "/admin",
    icon: "shield",
    priority: 180,
  },
  login: {
    key: "login",
    label: "Sign In",
    href: "/login",
    priority: 190,
  },
  signup: {
    key: "signup",
    label: "Join Free",
    href: "/signup",
    priority: 200,
  },
} as const satisfies Record<string, NavItemDefinition>;

type NavigationKey = keyof typeof NAV_ITEM_DEFINITIONS;

const PUBLIC_EXPLORE_KEYS: NavigationKey[] = [
  "home",
  "jobs",
  "events",
  "scholarships",
  "training",
  "schools",
  "businesses",
  "partners",
  "search",
  "live",
  "pricing",
];

const LANDING_INLINE_KEYS: NavigationKey[] = [
  "jobs",
  "events",
  "scholarships",
  "training",
  "schools",
  "businesses",
  "partners",
  "live",
  "pricing",
];

const MEMBER_EXPLORE_KEYS: NavigationKey[] = [
  "home",
  "live",
  "jobs",
  "events",
  "search",
  "partners",
  "schools",
  "members",
  "training",
  "businesses",
];

const MEMBER_DESKTOP_TOP_KEYS: NavigationKey[] = [
  "home",
  "live",
  "jobs",
  "events",
  "partners",
  "schools",
  "training",
  "businesses",
];

const MEMBER_UTILITY_KEYS: NavigationKey[] = ["saved", "notifications", "settings"];
const PUBLIC_AUTH_KEYS: NavigationKey[] = ["login", "signup"];

function resolveHref(href: NavHref, audience: NavigationAudience): string {
  if (typeof href === "string") return href;
  return href[audience];
}

function buildNavItems(keys: NavigationKey[], audience: NavigationAudience): NavItem[] {
  return keys.map((key) => {
    const definition = NAV_ITEM_DEFINITIONS[key];

    return {
      key: definition.key,
      label: definition.label,
      href: resolveHref(definition.href, audience),
      icon: "icon" in definition ? definition.icon : undefined,
      dot: "dot" in definition ? definition.dot : undefined,
      priority: definition.priority,
    };
  });
}

export function getBrandHref(isAuthenticated: boolean): string {
  return isAuthenticated ? "/feed" : "/";
}

export function getPublicExploreNavItems(): NavItem[] {
  return buildNavItems(PUBLIC_EXPLORE_KEYS, "public");
}

export function getLandingInlineNavItems(): NavItem[] {
  return buildNavItems(LANDING_INLINE_KEYS, "public");
}

export function getPublicAuthNavItems(): NavItem[] {
  return buildNavItems(PUBLIC_AUTH_KEYS, "public");
}

export function getMemberExploreNavItems(options?: {
  hasOrg?: boolean;
  isAdmin?: boolean;
}): NavItem[] {
  const items = buildNavItems(MEMBER_EXPLORE_KEYS, "member");

  if (options?.hasOrg) {
    items.push(buildNavItems(["dashboard"], "member")[0]);
  }

  if (options?.isAdmin) {
    items.push(buildNavItems(["admin"], "member")[0]);
  }

  return items;
}

export function getMemberDesktopTopNavItems(): NavItem[] {
  return buildNavItems(MEMBER_DESKTOP_TOP_KEYS, "member");
}

export function getMemberUtilityNavItems(): NavItem[] {
  return buildNavItems(MEMBER_UTILITY_KEYS, "member");
}

export function getAppExploreNavItems(options: {
  isAuthenticated: boolean;
  hasOrg?: boolean;
  isAdmin?: boolean;
}): NavItem[] {
  if (!options.isAuthenticated) {
    return getPublicExploreNavItems();
  }

  return getMemberExploreNavItems({
    hasOrg: options.hasOrg,
    isAdmin: options.isAdmin,
  });
}

export function getDesktopTopNavItems(options: { isAuthenticated: boolean }): NavItem[] {
  if (!options.isAuthenticated) {
    return getLandingInlineNavItems();
  }

  return getMemberDesktopTopNavItems();
}

export function getRailNavItems(options: {
  isAuthenticated: boolean;
  hasOrg?: boolean;
  isAdmin?: boolean;
}): NavItem[] {
  return getAppExploreNavItems(options);
}
