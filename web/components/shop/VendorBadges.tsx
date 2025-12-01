"use client";

import { type Vendor, type VerificationStatus } from "@/lib/firebase/vendors";

interface VendorBadgesProps {
  vendor: Vendor;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
}

/**
 * Display verification and feature badges for a vendor
 */
export function VendorBadges({
  vendor,
  size = "md",
  showLabels = true,
}: VendorBadgesProps) {
  const badges: {
    type: string;
    label: string;
    icon: React.ReactNode;
    bgColor: string;
    textColor: string;
    tooltip: string;
  }[] = [];

  // Verification badge
  if (vendor.verificationStatus === "verified") {
    badges.push({
      type: "verified",
      label: "Verified",
      icon: (
        <svg className="h-full w-full" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-400",
      tooltip: "This vendor has been verified by Shop Indigenous",
    });
  }

  // Featured badge
  if (vendor.featured) {
    badges.push({
      type: "featured",
      label: "Featured",
      icon: (
        <svg className="h-full w-full" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ),
      bgColor: "bg-yellow-500/10",
      textColor: "text-yellow-400",
      tooltip: "Featured vendor on Shop Indigenous",
    });
  }

  // Custom orders badge
  if (vendor.acceptsCustomOrders) {
    badges.push({
      type: "custom",
      label: "Custom Orders",
      icon: (
        <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      ),
      bgColor: "bg-[#14B8A6]/10",
      textColor: "text-[#14B8A6]",
      tooltip: "This vendor accepts custom orders",
    });
  }

  // Made to order badge
  if (vendor.madeToOrder) {
    badges.push({
      type: "madeToOrder",
      label: "Made to Order",
      icon: (
        <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      bgColor: "bg-purple-500/10",
      textColor: "text-purple-400",
      tooltip: "Products are handcrafted when you order",
    });
  }

  if (badges.length === 0) {
    return null;
  }

  const sizeClasses = {
    sm: {
      container: "gap-1",
      badge: "gap-1 px-2 py-0.5",
      icon: "h-3 w-3",
      text: "text-xs",
    },
    md: {
      container: "gap-1.5",
      badge: "gap-1.5 px-2.5 py-1",
      icon: "h-4 w-4",
      text: "text-xs",
    },
    lg: {
      container: "gap-2",
      badge: "gap-2 px-3 py-1.5",
      icon: "h-5 w-5",
      text: "text-sm",
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={`flex flex-wrap items-center ${classes.container}`}>
      {badges.map((badge) => (
        <span
          key={badge.type}
          title={badge.tooltip}
          className={`inline-flex items-center rounded-full font-medium ${badge.bgColor} ${badge.textColor} ${classes.badge}`}
        >
          <span className={classes.icon}>{badge.icon}</span>
          {showLabels && <span className={classes.text}>{badge.label}</span>}
        </span>
      ))}
    </div>
  );
}

/**
 * Compact badge for card displays
 */
export function VerificationBadge({
  status,
  size = "md",
}: {
  status: VerificationStatus;
  size?: "sm" | "md" | "lg";
}) {
  if (status !== "verified") {
    return null;
  }

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <span
      title="Verified Vendor"
      className={`inline-flex ${sizeClasses[size]} items-center justify-center text-blue-400`}
    >
      <svg className="h-full w-full" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}

/**
 * Pending verification badge
 */
export function PendingVerificationBadge({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "gap-1 px-2 py-0.5 text-xs",
    md: "gap-1.5 px-2.5 py-1 text-xs",
    lg: "gap-2 px-3 py-1.5 text-sm",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full bg-yellow-500/10 font-medium text-yellow-400 ${sizeClasses[size]}`}
    >
      <svg className={`${iconSizes[size]} animate-pulse`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Verification Pending
    </span>
  );
}

/**
 * Price range badge
 */
export function PriceRangeBadge({
  priceRange,
  size = "md",
}: {
  priceRange: string;
  size?: "sm" | "md" | "lg";
}) {
  const priceLabels: Record<string, { label: string; symbols: string }> = {
    budget: { label: "Budget-Friendly", symbols: "$" },
    mid: { label: "Mid-Range", symbols: "$$" },
    premium: { label: "Premium", symbols: "$$$" },
    luxury: { label: "Luxury", symbols: "$$$$" },
  };

  const { label, symbols } = priceLabels[priceRange] || priceLabels.mid;

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <span
      title={label}
      className={`font-medium text-slate-400 ${sizeClasses[size]}`}
    >
      {symbols}
    </span>
  );
}

/**
 * All badges in a row for vendor profiles
 */
export function VendorProfileBadges({ vendor }: { vendor: Vendor }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <VendorBadges vendor={vendor} size="md" />
      {vendor.priceRange && (
        <div className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1">
          <PriceRangeBadge priceRange={vendor.priceRange} size="sm" />
          <span className="text-xs text-slate-500">
            {vendor.priceRange === "budget" && "Budget-Friendly"}
            {vendor.priceRange === "mid" && "Mid-Range"}
            {vendor.priceRange === "premium" && "Premium"}
            {vendor.priceRange === "luxury" && "Luxury"}
          </span>
        </div>
      )}
    </div>
  );
}
