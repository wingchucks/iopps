"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import ShareButtons from "@/components/ShareButtons";
import { useAuth } from "@/components/AuthProvider";
import { getPowwowEvent, createPowwowRegistration } from "@/lib/firestore";
import type { PowwowEvent } from "@/lib/types";

export default function PowwowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const powwowId = params.powwowId as string;
  const { user } = useAuth();

  const [powwow, setPowwow] = useState<PowwowEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Registration form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [numberOfAttendees, setNumberOfAttendees] = useState(1);
  const [specialRequests, setSpecialRequests] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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

  // Auto-populate user info if logged in
  useEffect(() => {
    if (user) {
      setName(user.displayName || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!powwow) return;

    setSubmitting(true);
    setError(null);

    try {
      await createPowwowRegistration({
        powwowId: powwow.id,
        employerId: powwow.employerId,
        name,
        email,
        numberOfAttendees,
        specialRequests,
      });
      setSuccess(true);
      setTimeout(() => {
        if (user) {
          router.push("/member/dashboard");
        } else {
          setSuccess(false);
          setName("");
          setEmail("");
          setNumberOfAttendees(1);
          setSpecialRequests("");
        }
      }, 3000);
    } catch (err) {
      console.error("Failed to submit registration", err);
      setError("Failed to submit registration. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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

        {/* Registration Section */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
          <h2 className="text-xl font-bold text-slate-200">
            Register to Attend
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Pre-register for this event to help organizers plan for attendance.
          </p>

          {success ? (
            <div className="mt-6 rounded-lg border border-green-500/40 bg-green-500/10 p-6 text-center">
              <p className="text-lg font-semibold text-green-400">
                ✓ Registration submitted successfully!
              </p>
              <p className="mt-2 text-sm text-slate-300">
                We look forward to seeing you at the event!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Number of Attendees <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="50"
                  value={numberOfAttendees}
                  onChange={(e) => setNumberOfAttendees(parseInt(e.target.value) || 1)}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-400">
                  How many people will be attending with you? (Including yourself)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Special Requests or Questions (Optional)
                </label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  rows={4}
                  placeholder="Any accessibility needs, dietary requirements, or questions for the organizers..."
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Registering..." : "Register for Event"}
              </button>

              <p className="text-xs text-slate-400">
                Registration is free and helps organizers plan. You can update or cancel your registration by contacting the organizers.
              </p>
            </form>
          )}
        </div>
      </div>
    </PageShell>
  );
}
