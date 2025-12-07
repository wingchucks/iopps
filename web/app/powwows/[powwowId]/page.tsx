"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { PageShell } from "@/components/PageShell";
import ShareButtons from "@/components/ShareButtons";
import { getPowwowEvent } from "@/lib/firestore";
import type { PowwowEvent } from "@/lib/types";

export default function PowwowDetailPage() {
  const params = useParams();
  const powwowId = params.powwowId as string;

  const [powwow, setPowwow] = useState<PowwowEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPowwow = async () => {
      try {
        const data = await getPowwowEvent(powwowId);
        if (data) {
          setPowwow(data);
        } else {
          setError("Event not found");
        }
      } catch (err) {
        console.error("Failed to load event", err);
        setError("Failed to load event details");
      } finally {
        setLoading(false);
      }
    };
    loadPowwow();
  }, [powwowId]);

  if (loading) {
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <p className="text-slate-400">Loading event details...</p>
        </div>
      </PageShell>
    );
  }

  if (error || !powwow) {
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <h1 className="text-2xl font-bold text-slate-200">
            {error || "Event not found"}
          </h1>
          <Link
            href="/powwows"
            className="mt-6 inline-block rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]"
          >
            Back to Pow Wows & Events
          </Link>
        </div>
      </PageShell>
    );
  }

  const formatDate = (value: PowwowEvent["startDate"]) => {
    if (!value) return null;
    try {
      const date = typeof value === "object" && "toDate" in value
        ? value.toDate()
        : new Date(value);
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return typeof value === "string" ? value : null;
    }
  };

  const startDate = formatDate(powwow.startDate);
  const endDate = formatDate(powwow.endDate);

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl py-8">
        <Link
          href="/powwows"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-[#14B8A6]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Pow Wows & Events
        </Link>

        {/* Pow Wow Header */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-[#14B8A6]/30 bg-[#14B8A6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#14B8A6]">
              Event
            </span>
            {powwow.season && (
              <span className="inline-flex items-center rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-300">
                {powwow.season}
              </span>
            )}
            {powwow.livestream && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                Livestream Available
              </span>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-bold text-slate-50">{powwow.name}</h1>

          <div className="mt-3 flex flex-col gap-2 text-base">
            {powwow.host && (
              <div className="flex items-center gap-2 text-slate-300">
                <svg className="h-5 w-5 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Hosted by <span className="font-semibold">{powwow.host}</span></span>
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-300">
              <svg className="h-5 w-5 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-semibold">{powwow.location}</span>
            </div>
          </div>

          {/* Dates */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {powwow.dateRange ? (
              <span className="inline-flex items-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-base font-medium text-blue-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {powwow.dateRange}
              </span>
            ) : (startDate || endDate) && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-base font-medium text-blue-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {startDate && endDate && startDate !== endDate
                  ? `${startDate} - ${endDate}`
                  : startDate || endDate}
              </span>
            )}
            {powwow.registrationStatus && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-base font-medium text-emerald-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {powwow.registrationStatus}
              </span>
            )}
          </div>

          {/* Share Buttons */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <ShareButtons
              item={{
                id: powwow.id,
                title: powwow.name,
                description: powwow.description.substring(0, 150) + '...',
              }}
            />
          </div>
        </div>

        {/* Event Poster */}
        {powwow.imageUrl && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-200">Event Poster</h2>
              <a
                href={powwow.imageUrl}
                download={`${powwow.name.replace(/[^a-zA-Z0-9]/g, '_')}_poster`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Poster
              </a>
            </div>
            <div className="relative w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50">
              <div className="relative aspect-[3/4] w-full max-w-2xl mx-auto">
                <Image
                  src={powwow.imageUrl}
                  alt={`${powwow.name} event poster`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 672px"
                />
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-slate-500">
              Click the download button to save the full poster image
            </p>
          </div>
        )}

        {/* Description */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
          <h2 className="text-xl font-bold text-slate-200">About This Event</h2>
          <div className="mt-4 space-y-4 text-slate-300">
            {powwow.description.split("\n").map((paragraph, i) => (
              <p key={i} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
