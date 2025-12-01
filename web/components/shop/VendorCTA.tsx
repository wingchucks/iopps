"use client";

import { useState } from "react";
import type { Vendor } from "@/lib/firebase/vendors";
import { incrementWebsiteClick } from "@/lib/firebase/vendors";

interface VendorCTAProps {
  vendor: Vendor;
  onFavoriteClick?: () => void;
  isFavorited?: boolean;
}

export function VendorCTA({
  vendor,
  onFavoriteClick,
  isFavorited = false,
}: VendorCTAProps) {
  const [isShareOpen, setIsShareOpen] = useState(false);

  const handleWebsiteClick = async () => {
    try {
      await incrementWebsiteClick(vendor.id);
    } catch (error) {
      console.error("Failed to track website click:", error);
    }
    window.open(vendor.website, "_blank", "noopener,noreferrer");
  };

  const handleShare = async () => {
    const shareData = {
      title: vendor.businessName,
      text: vendor.tagline || `Check out ${vendor.businessName} on Shop Indigenous!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // User cancelled or error
        setIsShareOpen(true);
      }
    } else {
      setIsShareOpen(true);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsShareOpen(false);
  };

  return (
    <>
      {/* Sticky CTA Bar - Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-[#08090C]/95 p-4 backdrop-blur-sm md:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          {/* Primary CTA */}
          {vendor.website && (
            <button
              onClick={handleWebsiteClick}
              className="flex-1 rounded-full bg-[#14B8A6] px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-[#14B8A6]/90"
            >
              Visit Website
            </button>
          )}

          {/* Contact */}
          {vendor.email && (
            <a
              href={`mailto:${vendor.email}`}
              className="rounded-full border border-slate-700 p-3 text-slate-300 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </a>
          )}

          {/* Favorite */}
          <button
            onClick={onFavoriteClick}
            className={`rounded-full border p-3 transition ${
              isFavorited
                ? "border-red-500 bg-red-500/10 text-red-500"
                : "border-slate-700 text-slate-300 hover:border-red-500 hover:text-red-500"
            }`}
          >
            <svg
              className="h-5 w-5"
              fill={isFavorited ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="rounded-full border border-slate-700 p-3 text-slate-300 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Desktop CTA Buttons */}
      <div className="hidden gap-3 md:flex">
        {/* Primary CTA */}
        {vendor.website && (
          <button
            onClick={handleWebsiteClick}
            className="inline-flex items-center gap-2 rounded-full bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-[#14B8A6]/90"
          >
            Visit {vendor.businessName}&apos;s Website
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </button>
        )}

        {/* Contact */}
        {vendor.email && (
          <a
            href={`mailto:${vendor.email}`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
          >
            Contact
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </a>
        )}

        {/* Favorite */}
        <button
          onClick={onFavoriteClick}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition ${
            isFavorited
              ? "border-red-500 bg-red-500/10 text-red-500"
              : "border-slate-700 text-slate-200 hover:border-red-500 hover:text-red-500"
          }`}
        >
          <svg
            className="h-4 w-4"
            fill={isFavorited ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          {isFavorited ? "Favorited" : "Favorite"}
        </button>

        {/* Share */}
        <div className="relative">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            Share
          </button>
        </div>
      </div>

      {/* Share Modal */}
      {isShareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setIsShareOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-700 bg-[#08090C] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-100">
              Share {vendor.businessName}
            </h3>
            <div className="mt-4 grid grid-cols-4 gap-3">
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
                  window.location.href
                )}&text=${encodeURIComponent(
                  `Check out ${vendor.businessName} on Shop Indigenous!`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 rounded-lg p-3 transition hover:bg-slate-800"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800">
                  <span className="text-lg">𝕏</span>
                </div>
                <span className="text-xs text-slate-400">Twitter</span>
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                  window.location.href
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 rounded-lg p-3 transition hover:bg-slate-800"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
                  <span className="text-lg font-bold text-white">f</span>
                </div>
                <span className="text-xs text-slate-400">Facebook</span>
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(
                  `Check out ${vendor.businessName}`
                )}&body=${encodeURIComponent(
                  `I thought you might like this Indigenous-owned business: ${window.location.href}`
                )}`}
                className="flex flex-col items-center gap-2 rounded-lg p-3 transition hover:bg-slate-800"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <span className="text-xs text-slate-400">Email</span>
              </a>
              <button
                onClick={copyLink}
                className="flex flex-col items-center gap-2 rounded-lg p-3 transition hover:bg-slate-800"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#14B8A6]">
                  <svg
                    className="h-5 w-5 text-slate-900"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <span className="text-xs text-slate-400">Copy Link</span>
              </button>
            </div>
            <button
              onClick={() => setIsShareOpen(false)}
              className="mt-4 w-full rounded-full border border-slate-700 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
