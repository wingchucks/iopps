"use client";

import Link from "next/link";
import { PageShell } from "@/components/PageShell";

export default function CategoryNotFound() {
  return (
    <PageShell className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      {/* Icon */}
      <div className="rounded-full bg-slate-800/50 p-6">
        <svg
          className="h-16 w-16 text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      </div>

      {/* Message */}
      <h1 className="mt-6 text-2xl font-bold text-slate-50">
        Category Not Found
      </h1>
      <p className="mt-2 max-w-md text-slate-400">
        We couldn&apos;t find the category you&apos;re looking for. It may have
        been removed or the URL might be incorrect.
      </p>

      {/* Actions */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 rounded-xl bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-[#0D9488]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          Browse All Categories
        </Link>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:text-slate-200"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Go Back
        </button>
      </div>

      {/* Suggestions */}
      <div className="mt-12 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Popular Categories
        </h2>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            href="/shop/category/art-fine-crafts"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
          >
            Art & Fine Crafts
          </Link>
          <Link
            href="/shop/category/jewelry-accessories"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
          >
            Jewelry & Accessories
          </Link>
          <Link
            href="/shop/category/textiles-clothing"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
          >
            Textiles & Clothing
          </Link>
          <Link
            href="/shop/category/food-beverage"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
          >
            Food & Beverage
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
