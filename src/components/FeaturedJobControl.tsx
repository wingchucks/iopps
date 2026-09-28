"use client";

import Link from "next/link";

export interface FeaturedJobSummary {
  plan: string;
  featuredSlotsTotal: number;
  featuredSlotsUsed: number;
  featuredSlotsRemaining: number;
  featuredPostCredits: number;
  canFeatureJobs: boolean;
  isOverQuotaLegacy?: boolean;
}

interface FeaturedJobControlProps {
  summary: FeaturedJobSummary | null;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Called instead of navigating, so an unsaved job can be saved before checkout. */
  onPurchase?: (purchase: "featured-post" | "plans") => void;
  /** Local page to return to after checkout or plan selection. */
  returnTo?: string;
}

function purchaseHref(purchase: "featured-post" | "plans", returnTo?: string): string {
  const params = new URLSearchParams(purchase === "plans" ? {} : { plan: purchase });
  if (returnTo) params.set("redirect", returnTo);
  const query = params.toString();
  return `${purchase === "plans" ? "/org/plans" : "/org/checkout"}${query ? `?${query}` : ""}`;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  standard: "Standard",
  premium: "Premium",
  school: "School",
};

export default function FeaturedJobControl({
  summary,
  checked,
  onChange,
  disabled = false,
  onPurchase,
  returnTo,
}: FeaturedJobControlProps) {
  const planLabel = PLAN_LABELS[summary?.plan || "free"] || "Free";
  const hasCapacity = Boolean(summary?.canFeatureJobs);
  const canToggle = !disabled && (!summary || checked || hasCapacity);

  const helperText = !summary
    ? "Featured jobs are highlighted in the public jobs board and opportunities feed."
    : summary.isOverQuotaLegacy
      ? "You already have more featured jobs than your current allowance. Existing featured jobs stay live, but you need to unfeature one before adding another."
      : hasCapacity
        ? "Featured jobs appear in the premium featured strip and receive stronger placement in discovery."
        : summary.featuredSlotsTotal === 0 && summary.featuredSlotsUsed === 0
          ? "Featured placement requires an eligible paid plan or a featured job credit. Standard postings also require a paid credit or annual-plan allowance."
          : "Your featured capacity is in use. Unfeature an active job or buy a featured job credit to add another.";

  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid rgba(13,148,136,.2)",
        background: "linear-gradient(135deg, rgba(13,148,136,.08), rgba(8,15,31,.7))",
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--teal)",
            }}
          >
            Premium Placement
          </p>
          <h3
            style={{
              margin: "6px 0 4px",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text)",
            }}
          >
            Feature this job
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.5,
              color: "var(--text-muted)",
              maxWidth: 520,
            }}
          >
            {helperText} A featured credit covers one job posting with featured placement for your choice of up to 45 days.
          </p>
        </div>

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 999,
            background: canToggle ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.02)",
            border: `1px solid ${canToggle ? "rgba(13,148,136,.35)" : "rgba(255,255,255,.08)"}`,
            cursor: canToggle ? "pointer" : "not-allowed",
            opacity: canToggle ? 1 : 0.65,
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            disabled={!canToggle}
            onChange={(event) => onChange(event.target.checked)}
            style={{ width: 16, height: 16, accentColor: "var(--teal)" }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
            {checked ? "Featured" : "Standard listing"}
          </span>
        </label>
      </div>

      {summary && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              marginBottom: 12,
            }}
          >
            {[
              { label: "Current plan", value: planLabel },
              { label: "Featured slots", value: `${summary.featuredSlotsUsed}/${summary.featuredSlotsTotal}` },
              { label: "Slots remaining", value: `${summary.featuredSlotsRemaining}` },
              { label: "Featured credits", value: `${summary.featuredPostCredits}` },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.08)",
                  background: "rgba(255,255,255,.03)",
                  padding: "10px 12px",
                }}
              >
                <p style={{ margin: "0 0 4px", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {item.label}
                </p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {!hasCapacity && !checked && (
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {summary.plan !== "premium" && summary.plan !== "school" && (
                <PurchaseAction
                  purchase="plans"
                  onPurchase={onPurchase}
                  returnTo={returnTo}
                  className="brand-button"
                  style={{
                    background: "var(--button-gradient-soft)",
                    color: "var(--button-gradient-soft-text)",
                  }}
                >
                  Upgrade plan
                </PurchaseAction>
              )}
              <PurchaseAction
                purchase="featured-post"
                onPurchase={onPurchase}
                returnTo={returnTo}
                style={{
                  background: "rgba(245,158,11,.12)",
                  color: "#F59E0B",
                }}
              >
                Buy featured credit
              </PurchaseAction>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const purchaseActionStyle: React.CSSProperties = {
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "9px 14px",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
};

function PurchaseAction({
  purchase,
  onPurchase,
  returnTo,
  className,
  style,
  children,
}: {
  purchase: "featured-post" | "plans";
  onPurchase?: (purchase: "featured-post" | "plans") => void;
  returnTo?: string;
  className?: string;
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  if (onPurchase) {
    return (
      <button type="button" className={className} onClick={() => onPurchase(purchase)} style={{ ...purchaseActionStyle, ...style }}>
        {children}
      </button>
    );
  }
  return (
    <Link className={className} href={purchaseHref(purchase, returnTo)} style={{ ...purchaseActionStyle, ...style }}>
      {children}
    </Link>
  );
}
