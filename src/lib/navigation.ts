export type NavigationAudience = "public" | "member";
export type NavigationSectionKey = "explore" | "account" | "auth";
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
  | "handshake"
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
  mobileGroup?: NavigationSectionKey;
}

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon?: NavigationIconName;
  dot?: boolean;
  priority: number;
}

export interface NavSection {
  key: NavigationSectionKey;
  label: string;
  items: NavItem[];
}

const NAV_ITEM_DEFINITIONS = {
  home: {
    key: "home",
    label: "Home",
    href: { public: "/", member: "/feed" },
    icon: "home",
    priority: 10,
  },
  feed: {
    key: "feed",
    label: "Feed",
    href: "/feed",
    icon: "home",
    priority: 15,
    mobileGroup: "account",
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
    mobileGroup: "explore",
  },
  events: {
    key: "events",
    label: "Events",
    href: "/events",
    icon: "calendar",
    priority: 40,
    mobileGroup: "explore",
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
    mobileGroup: "explore",
  },
  schools: {
    key: "schools",
    label: "Schools",
    href: "/schools",
    icon: "school",
    priority: 70,
    mobileGroup: "explore",
  },
  businesses: {
    key: "businesses",
    label: "Businesses",
    href: "/businesses",
    icon: "store",
    priority: 80,
    mobileGroup: "explore",
  },
  partners: {
    key: "partners",
    label: "Partners",
    href: "/partners",
    icon: "shield",
    priority: 90,
    mobileGroup: "explore",
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
  mentorship: {
    key: "mentorship",
    label: "Mentorship",
    href: "/mentorship",
    icon: "handshake",
    priority: 120,
  },
  pricing: {
    key: "pricing",
    label: "Pricing",
    href: "/pricing",
    icon: "tag",
    priority: 130,
    mobileGroup: "explore",
  },
  saved: {
    key: "saved",
    label: "Saved",
    href: "/saved",
    icon: "bookmark",
    priority: 140,
    mobileGroup: "account",
  },
  notifications: {
    key: "notifications",
    label: "Notifications",
    href: "/notifications",
    icon: "bell",
    priority: 150,
    mobileGroup: "account",
  },
  settings: {
    key: "settings",
    label: "Settings",
    href: "/settings",
    icon: "settings",
    priority: 160,
    mobileGroup: "account",
  },
  dashboard: {
    key: "dashboard",
    label: "Dashboard",
    href: "/org/dashboard",
    icon: "dashboard",
    priority: 170,
    mobileGroup: "account",
  },
  admin: {
    key: "admin",
    label: "Admin",
    href: "/admin",
    icon: "shield",
    priority: 180,
    mobileGroup: "account",
  },
  login: {
    key: "login",
    label: "Sign In",
    href: "/login",
    priority: 190,
    mobileGroup: "auth",
  },
  signup: {
    key: "signup",
    label: "Join Free",
    href: "/signup",
    priority: 200,
    mobileGroup: "auth",
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
  "training",
  "mentorship",
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
const MOBILE_EXPLORE_KEYS: NavigationKey[] = [
  "jobs",
  "events",
  "businesses",
  "schools",
  "training",
  "partners",
  "pricing",
];
const MOBILE_ACCOUNT_BASE_KEYS: NavigationKey[] = [
  "feed",
  "saved",
  "notifications",
  "settings",
];

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

export function getMobileNavigationSections(options: {
  isAuthenticated: boolean;
  hasOrg?: boolean;
  isAdmin?: boolean;
}): NavSection[] {
  const sections: NavSection[] = [
    {
      key: "explore",
      label: "Explore",
      items: buildNavItems(MOBILE_EXPLORE_KEYS, "public"),
    },
  ];

  if (options.isAuthenticated) {
    const accountKeys = [...MOBILE_ACCOUNT_BASE_KEYS];

    if (options.hasOrg) {
      accountKeys.push("dashboard");
    }

    if (options.isAdmin) {
      accountKeys.push("admin");
    }

    sections.push({
      key: "account",
      label: "Your account",
      items: buildNavItems(accountKeys, "member"),
    });
  } else {
    sections.push({
      key: "auth",
      label: "Auth",
      items: buildNavItems(PUBLIC_AUTH_KEYS, "public"),
    });
  }

  return sections;
}

export function getRailNavItems(options: {
  isAuthenticated: boolean;
  hasOrg?: boolean;
  isAdmin?: boolean;
}): NavItem[] {
  return getAppExploreNavItems(options);
}
