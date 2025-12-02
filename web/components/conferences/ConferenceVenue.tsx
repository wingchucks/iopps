"use client";

import type { ConferenceVenue as VenueType } from "@/lib/types";

interface ConferenceVenueProps {
  venue: VenueType;
  location?: string;
  accessibilityFeatures?: string[];
}

export default function ConferenceVenue({
  venue,
  location,
  accessibilityFeatures,
}: ConferenceVenueProps) {
  const fullAddress = [
    venue.address,
    venue.city,
    venue.province,
    venue.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    fullAddress || venue.name
  )}`;

  return (
    <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8">
      <h2 className="text-xl font-bold text-slate-200">Venue & Travel</h2>
      <p className="mt-1 text-sm text-slate-400">
        Everything you need to know about getting there
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Map & Location */}
        <div className="space-y-4">
          {/* Map Embed or Placeholder */}
          <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
            {venue.mapUrl ? (
              <iframe
                src={venue.mapUrl}
                className="h-full w-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Map of ${venue.name}`}
              />
            ) : (
              <a
                href={googleMapsSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-800 to-slate-900 transition-colors hover:from-slate-700 hover:to-slate-800"
              >
                <svg
                  className="h-12 w-12 text-[#14B8A6]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-sm font-medium text-slate-300">
                  View on Google Maps
                </span>
              </a>
            )}
          </div>

          {/* Venue Card */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
            <h3 className="font-semibold text-slate-100">{venue.name}</h3>
            {fullAddress && (
              <p className="mt-1 text-sm text-slate-400">{fullAddress}</p>
            )}
            {!fullAddress && location && (
              <p className="mt-1 text-sm text-slate-400">{location}</p>
            )}

            <a
              href={venue.mapUrl || googleMapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#14B8A6] hover:underline"
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
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Get Directions
            </a>
          </div>
        </div>

        {/* Travel Info */}
        <div className="space-y-4">
          {/* Parking */}
          {venue.parkingInfo && (
            <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <svg
                    className="h-5 w-5 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-slate-200">Parking</h4>
                  <p className="text-sm text-slate-400">{venue.parkingInfo}</p>
                </div>
              </div>
            </div>
          )}

          {/* Public Transit */}
          {venue.transitInfo && (
            <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <svg
                    className="h-5 w-5 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-slate-200">Public Transit</h4>
                  <p className="text-sm text-slate-400">{venue.transitInfo}</p>
                </div>
              </div>
            </div>
          )}

          {/* Nearby Hotels */}
          {venue.nearbyHotels && (
            <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <svg
                    className="h-5 w-5 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-slate-200">Nearby Hotels</h4>
                  <p className="text-sm text-slate-400">{venue.nearbyHotels}</p>
                </div>
              </div>
            </div>
          )}

          {/* Accessibility */}
          {(venue.accessibilityInfo || (accessibilityFeatures && accessibilityFeatures.length > 0)) && (
            <div className="rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/5 p-4">
              <div className="flex items-start gap-3">
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
                      d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-slate-200">Accessibility</h4>
                  {venue.accessibilityInfo && (
                    <p className="mt-1 text-sm text-slate-400">
                      {venue.accessibilityInfo}
                    </p>
                  )}
                  {accessibilityFeatures && accessibilityFeatures.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {accessibilityFeatures.map((feature, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 rounded-full border border-[#14B8A6]/30 bg-[#14B8A6]/10 px-2 py-0.5 text-xs text-[#14B8A6]"
                        >
                          <svg
                            className="h-3 w-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
