"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/components/AuthProvider";
import { getConference, toggleSavedConference, listSavedConferenceIds, createConferenceRegistration } from "@/lib/firestore";
import type { Conference } from "@/lib/types";
import {
  ConferenceHero,
  ConferenceAgenda,
  ConferenceSpeakers,
  ConferenceVenue,
  ConferenceSidebar,
} from "@/components/conferences";

export default function ConferenceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const conferenceId = params.conferenceId as string;
  const { user, role } = useAuth();

  const [conference, setConference] = useState<Conference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [highlightedSpeakerId, setHighlightedSpeakerId] = useState<string | null>(null);

  // Registration form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regAttendees, setRegAttendees] = useState(1);
  const [regRequests, setRegRequests] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  useEffect(() => {
    const loadConference = async () => {
      try {
        const data = await getConference(conferenceId);
        if (data) {
          setConference(data);
        } else {
          setError("Conference not found");
        }
      } catch (err) {
        setError("Failed to load conference details");
      } finally {
        setLoading(false);
      }
    };
    loadConference();
  }, [conferenceId]);

  // Load saved state when user is logged in
  useEffect(() => {
    const loadSavedState = async () => {
      if (!user) {
        setIsSaved(false);
        return;
      }
      try {
        const savedIds = await listSavedConferenceIds(user.uid);
        setIsSaved(savedIds.includes(conferenceId));
      } catch {
        // Silently fail - not critical
      }
    };
    loadSavedState();
  }, [user, conferenceId]);

  const handleSave = useCallback(async () => {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = `/login?redirect=/conferences/${conferenceId}`;
      return;
    }

    const newSavedState = !isSaved;
    setIsSaved(newSavedState); // Optimistic update

    try {
      await toggleSavedConference(user.uid, conferenceId, newSavedState);
    } catch {
      // Revert on error
      setIsSaved(!newSavedState);
    }
  }, [user, conferenceId, isSaved]);

  const handleSpeakerClick = useCallback((speakerId: string) => {
    setHighlightedSpeakerId(speakerId);
    // Scroll to speakers section
    const speakersSection = document.getElementById("speakers-section");
    if (speakersSection) {
      speakersSection.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // Auto-populate registration form if user is logged in
  useEffect(() => {
    if (user) {
      setRegName(user.displayName || "");
      setRegEmail(user.email || "");
    }
  }, [user]);

  const handleRegistration = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!conference) return;

    setRegSubmitting(true);
    setRegError(null);

    try {
      await createConferenceRegistration({
        conferenceId: conference.id,
        employerId: conference.employerId,
        name: regName,
        email: regEmail,
        numberOfAttendees: regAttendees,
        specialRequests: regRequests,
      });
      setRegSuccess(true);
      setTimeout(() => {
        if (user) {
          router.push("/member/dashboard");
        } else {
          setRegSuccess(false);
          setRegName("");
          setRegEmail("");
          setRegAttendees(1);
          setRegRequests("");
        }
      }, 3000);
    } catch (err) {
      console.error("Failed to submit registration", err);
      setRegError("Failed to submit registration. Please try again.");
    } finally {
      setRegSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div className="mx-auto max-w-7xl py-8">
          {/* Loading skeleton */}
          <div className="animate-pulse">
            <div className="h-80 rounded-2xl bg-slate-800/50" />
            <div className="mt-6 space-y-4">
              <div className="h-8 w-2/3 rounded bg-slate-800/50" />
              <div className="h-4 w-1/2 rounded bg-slate-800/50" />
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (error || !conference) {
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <div className="rounded-2xl border border-slate-800 bg-[#08090C] p-12">
            <svg
              className="mx-auto h-16 w-16 text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h1 className="mt-6 text-2xl font-bold text-slate-200">
              {error || "Conference not found"}
            </h1>
            <p className="mt-2 text-slate-400">
              The conference you're looking for might have ended or been removed.
            </p>
            <Link
              href="/conferences"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]"
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Browse All Conferences
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const isEmployerOwner =
    role === "employer" && user && conference.employerId === user.uid;

  return (
    <PageShell className="pb-24 md:pb-10">
      <div className="mx-auto max-w-7xl">
        {/* Back Link */}
        <Link
          href="/conferences"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-[#14B8A6]"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Conferences
        </Link>

        {/* Hero Section */}
        <div className="mt-4">
          <ConferenceHero
            conference={conference}
            onSave={handleSave}
            isSaved={isSaved}
          />
        </div>

        {/* Owner Banner */}
        {isEmployerOwner && (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <svg
                  className="h-6 w-6 text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-semibold text-amber-200">
                    You published this conference
                  </p>
                  <p className="text-sm text-amber-300/70">
                    {conference.viewsCount || 0} views
                  </p>
                </div>
              </div>
              <Link
                href={`/organization/conferences/${conference.id}/edit`}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-400 transition-colors hover:bg-amber-500/30"
              >
                Edit Conference
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Main Column */}
          <div className="space-y-8 lg:col-span-2">
            {/* About Section */}
            <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-200">
                About This Conference
              </h2>
              <div className="mt-4 space-y-4 text-slate-300">
                {conference.description.split("\n").map((paragraph, i) => (
                  <p key={i} className="leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Target Audience */}
              {conference.targetAudience && conference.targetAudience.length > 0 && (
                <div className="mt-6 border-t border-slate-800 pt-4">
                  <h3 className="text-sm font-medium uppercase tracking-wider text-slate-500">
                    Who Should Attend
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {conference.targetAudience.map((audience, index) => (
                      <span
                        key={index}
                        className="rounded-full border border-[#14B8A6]/30 bg-[#14B8A6]/10 px-3 py-1 text-sm text-[#14B8A6]"
                      >
                        {audience}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Indigenous Protocols Section */}
            {(conference.territoryAcknowledgement ||
              conference.elderAcknowledgement ||
              conference.indigenousProtocols ||
              conference.trc92Commitment) && (
              <section className="rounded-2xl border border-[#14B8A6]/30 bg-gradient-to-br from-[#14B8A6]/5 to-transparent p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#14B8A6]/10">
                    <svg
                      className="h-5 w-5 text-[#14B8A6]"
                      fill="none"
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
                  </div>
                  <h2 className="text-xl font-bold text-slate-200">
                    Indigenous Protocols
                  </h2>
                </div>

                <div className="mt-6 space-y-4">
                  {conference.territoryAcknowledgement && (
                    <div>
                      <h3 className="text-sm font-medium text-[#14B8A6]">
                        Territory Acknowledgement
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-300">
                        {conference.territoryAcknowledgement}
                      </p>
                    </div>
                  )}

                  {conference.elderAcknowledgement && (
                    <div>
                      <h3 className="text-sm font-medium text-[#14B8A6]">
                        Elder Acknowledgement
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-300">
                        {conference.elderAcknowledgement}
                      </p>
                    </div>
                  )}

                  {conference.indigenousProtocols && (
                    <div>
                      <h3 className="text-sm font-medium text-[#14B8A6]">
                        Cultural Protocols
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-300">
                        {conference.indigenousProtocols}
                      </p>
                    </div>
                  )}

                  {conference.indigenousLanguageSupport &&
                    conference.indigenousLanguageSupport.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-[#14B8A6]">
                          Language Support
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {conference.indigenousLanguageSupport.map((lang, index) => (
                            <span
                              key={index}
                              className="rounded-full bg-[#14B8A6]/10 px-3 py-1 text-sm text-[#14B8A6]"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {conference.trc92Commitment && (
                    <div className="rounded-lg border border-[#14B8A6]/20 bg-[#14B8A6]/5 p-4">
                      <p className="text-sm leading-relaxed text-slate-400">
                        <span className="font-semibold text-[#14B8A6]">
                          TRC Call to Action #92:
                        </span>{" "}
                        This conference is committed to meaningful engagement
                        with Indigenous peoples and advancing reconciliation
                        through education and dialogue.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Agenda Section */}
            {conference.agenda && conference.agenda.length > 0 && (
              <ConferenceAgenda
                agenda={conference.agenda}
                speakers={conference.speakers}
                onSpeakerClick={handleSpeakerClick}
              />
            )}

            {/* Speakers Section */}
            {conference.speakers && conference.speakers.length > 0 && (
              <div id="speakers-section">
                <ConferenceSpeakers
                  speakers={conference.speakers}
                  agenda={conference.agenda}
                  highlightedSpeakerId={highlightedSpeakerId}
                />
              </div>
            )}

            {/* Venue Section */}
            {conference.venue && (
              <ConferenceVenue
                venue={conference.venue}
                location={conference.location}
                accessibilityFeatures={conference.accessibilityFeatures}
              />
            )}

            {/* Sponsors Section */}
            {conference.sponsors && conference.sponsors.length > 0 && (
              <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8">
                <h2 className="text-xl font-bold text-slate-200">Sponsors</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Thank you to our sponsors for making this event possible
                </p>

                <div className="mt-6 space-y-6">
                  {["platinum", "gold", "silver", "bronze", "community"].map(
                    (tier) => {
                      const tierSponsors = conference.sponsors?.filter(
                        (s) => s.tier === tier
                      );
                      if (!tierSponsors || tierSponsors.length === 0) return null;

                      return (
                        <div key={tier}>
                          <h3 className="text-sm font-medium uppercase tracking-wider text-slate-500 capitalize">
                            {tier} Sponsors
                          </h3>
                          <div className="mt-3 flex flex-wrap gap-4">
                            {tierSponsors.map((sponsor) => (
                              <a
                                key={sponsor.id}
                                href={sponsor.websiteUrl || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3 transition-colors hover:border-slate-600"
                              >
                                {sponsor.logoUrl ? (
                                  <img
                                    src={sponsor.logoUrl}
                                    alt={sponsor.name}
                                    className="h-10 w-auto max-w-[120px] object-contain"
                                  />
                                ) : (
                                  <span className="font-medium text-slate-300">
                                    {sponsor.name}
                                  </span>
                                )}
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </section>
            )}

            {/* FAQ Section */}
            {conference.faqs && conference.faqs.length > 0 && (
              <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8">
                <h2 className="text-xl font-bold text-slate-200">
                  Frequently Asked Questions
                </h2>

                <div className="mt-6 space-y-4">
                  {conference.faqs.map((faq, index) => (
                    <details
                      key={index}
                      className="group rounded-lg border border-slate-700 bg-slate-900/50"
                    >
                      <summary className="flex cursor-pointer items-center justify-between p-4 font-medium text-slate-200">
                        {faq.question}
                        <svg
                          className="h-5 w-5 text-slate-500 transition-transform group-open:rotate-180"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </summary>
                      <div className="border-t border-slate-700 p-4">
                        <p className="text-sm leading-relaxed text-slate-400">
                          {faq.answer}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* Registration Section */}
            <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-200">
                Register to Attend
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Pre-register for this conference to help organizers plan for attendance.
              </p>

              {regSuccess ? (
                <div className="mt-6 rounded-lg border border-green-500/40 bg-green-500/10 p-6 text-center">
                  <p className="text-lg font-semibold text-green-400">
                    ✓ Registration submitted successfully!
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    We look forward to seeing you at the conference!
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRegistration} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-200">
                        Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
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
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
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
                      value={regAttendees}
                      onChange={(e) => setRegAttendees(parseInt(e.target.value) || 1)}
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
                      value={regRequests}
                      onChange={(e) => setRegRequests(e.target.value)}
                      rows={4}
                      placeholder="Any accessibility needs, dietary requirements, or questions for the organizers..."
                      className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                    />
                  </div>

                  {regError && (
                    <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {regError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={regSubmitting}
                    className="w-full rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {regSubmitting ? "Registering..." : "Register for Conference"}
                  </button>

                  <p className="text-xs text-slate-400">
                    Registration is free and helps organizers plan. You can update or cancel your registration by contacting the organizers.
                  </p>
                </form>
              )}
            </section>

            {/* Sign-up CTA for non-logged users */}
            {!user && (
              <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 text-center">
                <h3 className="text-lg font-bold text-slate-200">
                  Join IOPPS to stay updated
                </h3>
                <p className="mt-2 text-slate-400">
                  Create an account to save conferences, get event reminders, and
                  connect with the Indigenous professional community.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/login"
                    className="rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition-colors hover:border-[#14B8A6] hover:text-[#14B8A6]"
                  >
                    Create Account
                  </Link>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <ConferenceSidebar conference={conference} />
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
