"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { FeedLayout } from "@/components/opportunity-graph";
import { useAuth } from "@/components/AuthProvider";
import { toggleSavedConference, listSavedConferenceIds, isConferenceExpired } from "@/lib/firestore";
import type { Conference } from "@/lib/types";
import {
  ConferenceHero,
  ConferenceAgenda,
  ConferenceSpeakers,
  ConferenceVenue,
  ConferenceSidebar,
} from "@/components/conferences";

interface ConferenceDetailClientProps {
  conference: Conference | null;
  error?: string;
}

export default function ConferenceDetailClient({ conference: initialConference, error: initialError }: ConferenceDetailClientProps) {
  const { user, role } = useAuth();

  const [conference, setConference] = useState<Conference | null>(initialConference);
  const [error, setError] = useState<string | null>(initialError || null);
  const [isSaved, setIsSaved] = useState(false);
  const [highlightedSpeakerId, setHighlightedSpeakerId] = useState<string | null>(null);

  // Check if conference is expired on client side
  useEffect(() => {
    if (initialConference) {
      if (initialConference.active === false || isConferenceExpired(initialConference)) {
        setError("This conference has ended");
        setConference(null);
      } else {
        setConference(initialConference);
      }
    }
  }, [initialConference]);

  // Load saved state when user is logged in
  useEffect(() => {
    const loadSavedState = async () => {
      if (!user || !conference) {
        setIsSaved(false);
        return;
      }
      try {
        const savedIds = await listSavedConferenceIds(user.uid);
        setIsSaved(savedIds.includes(conference.id));
      } catch {
        // Silently fail - not critical
      }
    };
    loadSavedState();
  }, [user, conference]);

  const handleSave = useCallback(async () => {
    if (!user || !conference) {
      // Redirect to login if not authenticated
      window.location.href = `/login?redirect=/conferences/${conference?.id}`;
      return;
    }

    const newSavedState = !isSaved;
    setIsSaved(newSavedState); // Optimistic update

    try {
      await toggleSavedConference(user.uid, conference.id, newSavedState);
    } catch {
      // Revert on error
      setIsSaved(!newSavedState);
    }
  }, [user, conference, isSaved]);

  const handleSpeakerClick = useCallback((speakerId: string) => {
    setHighlightedSpeakerId(speakerId);
    // Scroll to speakers section
    const speakersSection = document.getElementById("speakers-section");
    if (speakersSection) {
      speakersSection.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  if (error || !conference) {
    const isEnded = error?.toLowerCase().includes("ended");
    return (
      <FeedLayout activeNav="events" fullWidth>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-12">
            <svg
              className="mx-auto h-16 w-16 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isEnded ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
            </svg>
            <h1 className="mt-6 text-2xl font-bold text-slate-700">
              {isEnded ? "Conference Has Ended" : "Conference Not Found"}
            </h1>
            <p className="mt-2 text-slate-500">
              {isEnded
                ? "This conference has concluded. Check out upcoming conferences below."
                : "The conference you're looking for might have been removed."}
            </p>
            <Link
              href="/conferences"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0D9488] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#0F766E]"
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
              Browse Upcoming Conferences
            </Link>
          </div>
        </div>
      </FeedLayout>
    );
  }

  const isEmployerOwner =
    role === "employer" && user && conference.employerId === user.uid;

  return (
    <FeedLayout activeNav="events" fullWidth className="pb-24 md:pb-10">
      <div className="mx-auto max-w-7xl">
        {/* Back Link */}
        <Link
          href="/conferences"
          className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-[#0D9488]"
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
          <div className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-50 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <svg
                  className="h-6 w-6 text-amber-600"
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
                  <p className="font-semibold text-amber-700">
                    You published this conference
                  </p>
                  <p className="text-sm text-amber-600">
                    {conference.viewsCount || 0} views
                  </p>
                </div>
              </div>
              <Link
                href={`/organization/conferences/${conference.id}/edit`}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-600 transition-colors hover:bg-amber-100"
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
            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-700">
                About This Conference
              </h2>
              <div className="mt-4 space-y-4 text-slate-600">
                {conference.description.split("\n").map((paragraph, i) => (
                  <p key={i} className="leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Target Audience */}
              {conference.targetAudience && conference.targetAudience.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-medium uppercase tracking-wider text-slate-500">
                    Who Should Attend
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {conference.targetAudience.map((audience, index) => (
                      <span
                        key={index}
                        className="rounded-full border border-[#0D9488]/30 bg-[#0D9488]/10 px-3 py-1 text-sm text-[#0D9488]"
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
              <section className="rounded-2xl border border-[#0D9488]/30 bg-gradient-to-br from-[#0D9488]/5 to-transparent p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0D9488]/10">
                    <svg
                      className="h-5 w-5 text-[#0D9488]"
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
                  <h2 className="text-xl font-bold text-slate-700">
                    Indigenous Protocols
                  </h2>
                </div>

                <div className="mt-6 space-y-4">
                  {conference.territoryAcknowledgement && (
                    <div>
                      <h3 className="text-sm font-medium text-[#0D9488]">
                        Territory Acknowledgement
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {conference.territoryAcknowledgement}
                      </p>
                    </div>
                  )}

                  {conference.elderAcknowledgement && (
                    <div>
                      <h3 className="text-sm font-medium text-[#0D9488]">
                        Elder Acknowledgement
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {conference.elderAcknowledgement}
                      </p>
                    </div>
                  )}

                  {conference.indigenousProtocols && (
                    <div>
                      <h3 className="text-sm font-medium text-[#0D9488]">
                        Cultural Protocols
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {conference.indigenousProtocols}
                      </p>
                    </div>
                  )}

                  {conference.indigenousLanguageSupport &&
                    conference.indigenousLanguageSupport.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-[#0D9488]">
                          Language Support
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {conference.indigenousLanguageSupport.map((lang, index) => (
                            <span
                              key={index}
                              className="rounded-full bg-[#0D9488]/10 px-3 py-1 text-sm text-[#0D9488]"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {conference.trc92Commitment && (
                    <div className="rounded-lg border border-[#0D9488]/20 bg-[#0D9488]/5 p-4">
                      <p className="text-sm leading-relaxed text-slate-500">
                        <span className="font-semibold text-[#0D9488]">
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
              <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <h2 className="text-xl font-bold text-slate-700">Sponsors</h2>
                <p className="mt-1 text-sm text-slate-500">
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
                                className="flex items-center gap-3 rounded-lg border border-slate-300 bg-slate-50 p-3 transition-colors hover:border-slate-400"
                              >
                                {sponsor.logoUrl ? (
                                  <img
                                    src={sponsor.logoUrl}
                                    alt={sponsor.name}
                                    className="h-10 w-auto max-w-[120px] object-contain"
                                  />
                                ) : (
                                  <span className="font-medium text-slate-600">
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
              <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <h2 className="text-xl font-bold text-slate-700">
                  Frequently Asked Questions
                </h2>

                <div className="mt-6 space-y-4">
                  {conference.faqs.map((faq, index) => (
                    <details
                      key={index}
                      className="group rounded-lg border border-slate-300 bg-slate-50"
                    >
                      <summary className="flex cursor-pointer items-center justify-between p-4 font-medium text-slate-700">
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
                      <div className="border-t border-slate-300 p-4">
                        <p className="text-sm leading-relaxed text-slate-500">
                          {faq.answer}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* Registration Section */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-700">
                Register to Attend
              </h2>

              {/* If there's an external registration link, show that */}
              {conference.registrationLink ? (
                <div className="mt-4">
                  <p className="text-sm text-slate-500">
                    Registration for this conference is handled externally by the organizers.
                  </p>
                  <a
                    href={conference.registrationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0D9488] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#0F766E]"
                  >
                    Register on External Site
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
                  </a>
                  {conference.contactEmail && (
                    <p className="mt-4 text-sm text-slate-500">
                      Questions? Contact the organizers at{" "}
                      <a
                        href={`mailto:${conference.contactEmail}?subject=Question about ${conference.title}`}
                        className="text-[#0D9488] hover:underline"
                      >
                        {conference.contactEmail}
                      </a>
                    </p>
                  )}
                </div>
              ) : conference.contactEmail ? (
                /* No registration link - show contact option */
                <div className="mt-4">
                  <p className="text-sm text-slate-500">
                    To register for this conference, please contact the organizers directly.
                  </p>
                  <a
                    href={`mailto:${conference.contactEmail}?subject=Registration Inquiry - ${conference.title}`}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0D9488] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#0F766E]"
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
                    Email Organizers to Register
                  </a>
                  {conference.contactPhone && (
                    <p className="mt-4 text-center text-sm text-slate-500">
                      Or call{" "}
                      <a
                        href={`tel:${conference.contactPhone}`}
                        className="text-[#0D9488] hover:underline"
                      >
                        {conference.contactPhone}
                      </a>
                    </p>
                  )}
                </div>
              ) : (
                /* No registration link and no contact email - show basic info */
                <div className="mt-4">
                  <p className="text-sm text-slate-500">
                    Registration details will be posted soon. Check back later or save this conference to receive updates.
                  </p>
                </div>
              )}
            </section>

            {/* Sign-up CTA for non-logged users */}
            {!user && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center">
                <h3 className="text-lg font-bold text-slate-700">
                  Join IOPPS to stay updated
                </h3>
                <p className="mt-2 text-slate-500">
                  Create an account to save conferences, get event reminders, and
                  connect with the Indigenous professional community.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/login"
                    className="rounded-lg bg-[#0D9488] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#0F766E]"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition-colors hover:border-[#0D9488] hover:text-[#0D9488]"
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
    </FeedLayout>
  );
}
