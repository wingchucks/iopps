"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getMentors,
  requestMentorship,
  type MentorProfile,
} from "@/lib/firestore/mentorship";

const expertiseOptions = [
  "Technology",
  "Business",
  "Health",
  "Education",
  "Trades",
  "Arts & Culture",
  "Law",
  "Finance",
];

function availabilityBadge(avail: string) {
  switch (avail) {
    case "available":
      return { text: "Available", color: "var(--green)", bg: "var(--green-soft)" };
    case "limited":
      return { text: "Limited", color: "var(--gold)", bg: "var(--gold-soft)" };
    default:
      return { text: "Unavailable", color: "var(--text-muted)", bg: "var(--border)" };
  }
}

export default function MentorshipPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameSearch, setNameSearch] = useState("");
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");

  // Request modal
  const [requestModal, setRequestModal] = useState<MentorProfile | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestGoals, setRequestGoals] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMentors()
      .then(setMentors)
      .catch((err) => console.error("Failed to load mentors:", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let items = mentors;
    if (nameSearch.trim()) {
      const q = nameSearch.toLowerCase();
      items = items.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.bio || "").toLowerCase().includes(q) ||
          (m.expertise || []).some((e) => e.toLowerCase().includes(q))
      );
    }
    if (selectedExpertise.length > 0) {
      items = items.filter((m) =>
        (m.expertise || []).some((e) =>
          selectedExpertise.some((se) => e.toLowerCase().includes(se.toLowerCase()))
        )
      );
    }
    if (availabilityFilter !== "all") {
      items = items.filter((m) => m.availability === availabilityFilter);
    }
    if (locationFilter.trim()) {
      const q = locationFilter.toLowerCase();
      items = items.filter((m) => m.location.toLowerCase().includes(q));
    }
    return items;
  }, [mentors, nameSearch, selectedExpertise, availabilityFilter, locationFilter]);

  const toggleExpertise = (exp: string) => {
    setSelectedExpertise((prev) =>
      prev.includes(exp) ? prev.filter((e) => e !== exp) : [...prev, exp]
    );
  };

  const handleRequestSubmit = async () => {
    if (!user || !requestModal) return;
    if (!requestMessage.trim()) {
      showToast("Please write a message to the mentor", "error");
      return;
    }
    setSubmitting(true);
    try {
      const goals = requestGoals
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);
      await requestMentorship({
        mentorId: requestModal.userId,
        mentorName: requestModal.name,
        menteeId: user.uid,
        menteeName: user.displayName || user.email || "Member",
        message: requestMessage,
        goals,
      });
      showToast("Mentorship request sent!");
      setRequestModal(null);
      setRequestMessage("");
      setRequestGoals("");
    } catch (err) {
      console.error("Failed to send request:", err);
      showToast("Failed to send request. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
    <AppShell>
      <div className="min-h-screen bg-bg">
        <div className="skeleton h-52 mb-6" />
        <div className="max-w-6xl mx-auto px-4 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-2xl skeleton" />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
    );
  }

  return (
    <AppShell>
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <div
        className="py-12 px-4 text-center"
        style={{
          background: "linear-gradient(135deg, var(--purple), #5B21B6)",
        }}
      >
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Mentorship
        </h1>
        <p className="text-white/80 max-w-xl mx-auto text-lg">
          Connect with experienced Indigenous professionals for guidance and
          career support
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-10 py-8">
        {/* Search bar */}
        <div className="mb-6">
          <input
            type="text"
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            placeholder="Search mentors by name, expertise, or bio..."
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-purple"
            style={{ maxWidth: 520 }}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters sidebar - desktop */}
          <aside className="hidden lg:block w-64 shrink-0">
            <Card className="p-5 sticky top-24">
              <h3
                className="font-bold text-sm mb-4"
                style={{ color: "var(--text)" }}
              >
                Filters
              </h3>

              <div className="mb-5">
                <label
                  className="text-xs font-bold mb-2 block"
                  style={{ color: "var(--text-sec)" }}
                >
                  Expertise Area
                </label>
                <div className="flex flex-col gap-2">
                  {expertiseOptions.map((exp) => (
                    <label
                      key={exp}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                      style={{ color: "var(--text-sec)" }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedExpertise.includes(exp)}
                        onChange={() => toggleExpertise(exp)}
                        className="rounded"
                        style={{ accentColor: "var(--purple)" }}
                      />
                      {exp}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <label
                  className="text-xs font-bold mb-2 block"
                  style={{ color: "var(--text-sec)" }}
                >
                  Availability
                </label>
                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm bg-card"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                >
                  <option value="all">All</option>
                  <option value="available">Available</option>
                  <option value="limited">Limited</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>

              <div>
                <label
                  className="text-xs font-bold mb-2 block"
                  style={{ color: "var(--text-sec)" }}
                >
                  Location
                </label>
                <input
                  type="text"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  placeholder="Search location..."
                  className="w-full rounded-lg px-3 py-2 text-sm bg-card"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>
            </Card>
          </aside>

          {/* Mobile filters */}
          <div className="lg:hidden flex flex-wrap gap-2 mb-2">
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm bg-card"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <option value="all">All Availability</option>
              <option value="available">Available</option>
              <option value="limited">Limited</option>
              <option value="unavailable">Unavailable</option>
            </select>
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Location..."
              className="rounded-lg px-3 py-2 text-sm bg-card flex-1 min-w-[140px]"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>

          {/* Mentor grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-xl font-bold"
                style={{ color: "var(--text)" }}
              >
                Find a Mentor
              </h2>
              <span
                className="text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                {filtered.length} mentor{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {filtered.length === 0 ? (
              <Card className="p-10 text-center">
                <div className="text-4xl mb-3">🤝</div>
                <p
                  className="font-bold mb-1"
                  style={{ color: "var(--text)" }}
                >
                  No mentors found
                </p>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-sec)" }}
                >
                  Try adjusting your filters or check back later.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((mentor) => {
                  const badge = availabilityBadge(mentor.availability);
                  return (
                    <Card key={mentor.id} className="p-5 flex flex-col">
                      <div className="flex items-start gap-3 mb-3">
                        {/* Avatar */}
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                          style={{
                            background:
                              "linear-gradient(135deg, var(--purple), #5B21B6)",
                          }}
                        >
                          {mentor.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className="font-bold text-sm truncate"
                            style={{ color: "var(--text)" }}
                          >
                            {mentor.name}
                          </h3>
                          <p
                            className="text-xs truncate"
                            style={{ color: "var(--text-sec)" }}
                          >
                            {mentor.location}
                          </p>
                        </div>
                        <Badge
                          text={badge.text}
                          color={badge.color}
                          bg={badge.bg}
                          small
                        />
                      </div>

                      {/* Expertise chips */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(mentor.expertise || []).slice(0, 3).map((exp) => (
                          <Badge
                            key={exp}
                            text={exp}
                            color="var(--purple)"
                            bg="var(--purple-soft)"
                            small
                          />
                        ))}
                        {(mentor.expertise || []).length > 3 && (
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            +{(mentor.expertise || []).length - 3}
                          </span>
                        )}
                      </div>

                      <p
                        className="text-xs mb-3"
                        style={{ color: "var(--text-sec)" }}
                      >
                        {mentor.yearsExperience} years experience
                      </p>

                      <div className="mt-auto">
                        <button
                          onClick={() => {
                            if (!user) {
                              showToast(
                                "Please sign in to request mentorship",
                                "error"
                              );
                              return;
                            }
                            if (user.uid === mentor.userId) {
                              showToast(
                                "You cannot request mentorship from yourself",
                                "error"
                              );
                              return;
                            }
                            setRequestModal(mentor);
                          }}
                          className="w-full py-2 rounded-xl text-sm font-bold text-white transition-colors"
                          style={{ background: "var(--purple)" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#6D28D9")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "var(--purple)")
                          }
                        >
                          Request Mentorship
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Become a Mentor CTA */}
        <div
          className="mt-12 rounded-2xl p-8 text-center"
          style={{
            background: "linear-gradient(135deg, var(--purple-soft), var(--blue-soft))",
            border: "1px solid var(--border)",
          }}
        >
          <h2
            className="text-xl font-bold mb-2"
            style={{ color: "var(--text)" }}
          >
            Want to Give Back?
          </h2>
          <p
            className="mb-5 max-w-lg mx-auto"
            style={{ color: "var(--text-sec)" }}
          >
            Share your knowledge and experience with the next generation of
            Indigenous professionals.
          </p>
          <Link
            href="/mentorship/become"
            className="inline-block px-6 py-3 rounded-xl text-white font-bold transition-colors"
            style={{ background: "var(--purple)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "#6D28D9")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--purple)")
            }
          >
            Become a Mentor
          </Link>
        </div>
      </div>

      {/* Request Modal */}
      {requestModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setRequestModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 bg-card"
            style={{ border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-lg font-bold mb-1"
              style={{ color: "var(--text)" }}
            >
              Request Mentorship
            </h3>
            <p
              className="text-sm mb-5"
              style={{ color: "var(--text-sec)" }}
            >
              Send a request to {requestModal.name}
            </p>

            <label
              className="text-xs font-bold mb-1 block"
              style={{ color: "var(--text-sec)" }}
            >
              Your Message
            </label>
            <textarea
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              rows={4}
              placeholder="Introduce yourself and explain why you'd like mentorship..."
              className="w-full rounded-xl px-4 py-3 text-sm mb-4 bg-card resize-none"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />

            <label
              className="text-xs font-bold mb-1 block"
              style={{ color: "var(--text-sec)" }}
            >
              Goals (comma-separated)
            </label>
            <input
              value={requestGoals}
              onChange={(e) => setRequestGoals(e.target.value)}
              placeholder="Career growth, Networking, Skill development..."
              className="w-full rounded-xl px-4 py-3 text-sm mb-5 bg-card"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />

            <div className="flex gap-3">
              <button
                onClick={() => setRequestModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--text-sec)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRequestSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
                style={{ background: "var(--purple)" }}
              >
                {submitting ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pb-24" />
    </div>
    </AppShell>
  );
}
