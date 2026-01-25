"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export type PricingCardProps = {
  title: string;
  price: string;
  period?: string;
  features: readonly string[] | string[];
  badge?: string;
  highlighted?: boolean;
  buttonText?: string;
  buttonAction?: () => void;
  buttonHref?: string;
  loading?: boolean;
  requiresAuth?: boolean;
  disabled?: boolean;
  helperText?: string;
};

export default function PricingCard({
  title,
  price,
  period,
  features,
  badge,
  highlighted = false,
  buttonText = "Get Started",
  buttonAction,
  buttonHref,
  loading = false,
  requiresAuth = false,
  disabled = false,
  helperText,
}: PricingCardProps) {
  const { user } = useAuth();

  const handleClick = () => {
    if (disabled) return;
    if (requiresAuth && !user) {
      window.location.href = "/register?redirect=" + encodeURIComponent(window.location.pathname);
      return;
    }
    if (buttonAction) buttonAction();
  };

  return (
    <article
      className={`flex flex-col rounded-2xl border p-6 shadow-lg shadow-black/30 transition-all ${
        highlighted
          ? "border-[#14B8A6] bg-[#14B8A6]/5 ring-1 ring-[#14B8A6]/50"
          : "border-slate-800/80 bg-[#08090C]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-bold text-slate-50">{title}</h3>
        {badge && (
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
            highlighted
              ? "border border-[#14B8A6] bg-[#14B8A6] text-slate-900"
              : "border border-[#14B8A6]/30 bg-[#14B8A6]/10 text-[#14B8A6]"
          }`}>
            {badge}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-bold text-[#14B8A6]">{price}</span>
        {period && <span className="text-sm text-slate-400">{period}</span>}
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3 text-sm text-slate-300">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#14B8A6]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        {buttonHref ? (
          <Link
            href={buttonHref}
            className={`block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition-all ${
              highlighted
                ? "bg-[#14B8A6] text-slate-900 hover:bg-[#16cdb8]"
                : "border border-slate-700 bg-slate-800/60 text-slate-100 hover:border-[#14B8A6] hover:bg-slate-800"
            }`}
          >
            {buttonText}
          </Link>
        ) : (
          <button
            onClick={handleClick}
            disabled={loading || disabled}
            className={`block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition-all ${
              loading || disabled
                ? "cursor-not-allowed opacity-50"
                : ""
            } ${
              highlighted
                ? "bg-[#14B8A6] text-slate-900 hover:bg-[#16cdb8]"
                : "border border-slate-700 bg-slate-800/60 text-slate-100 hover:border-[#14B8A6] hover:bg-slate-800"
            }`}
          >
            {loading ? "Processing..." : buttonText}
          </button>
        )}
        {helperText && (
          <p className="mt-2 text-center text-xs text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    </article>
  );
}
