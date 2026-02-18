"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getTrainingBySlug,
  enrollInProgram,
  getUserEnrollments,
  type TrainingProgram,
} from "@/lib/firestore/training";

const categoryColors: Record<string, { color: string; bg: string }> = {
  Technology: { color: "var(--blue)", bg: "var(--blue-soft)" },
  Business: { color: "var(--gold)", bg: "var(--gold-soft)" },
  Trades: { color: "var(--green)", bg: "var(--green-soft)" },
  Health: { color: "var(--red)", bg: "var(--red-soft)" },
  Culture: { color: "var(--purple)", bg: "var(--purple-soft)" },
};

function getCategoryStyle(category: string) {
  return (
    categoryColors[category] || {
      color: "var(--teal)",
      bg: "var(--teal-soft)",
    }
  );
}

export default function TrainingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const slug = params.slug as string;

  const [program, setProgram] = useState<TrainingProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);

  useEffect(() => {
    getTrainingBySlug(slug)
      .then(setProgram)
      .catch((err) => console.error("Failed to load program:", err))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!user || !program) return;
    getUserEnrollments(user.uid).then((enrollments) => {
      const enrolled = enrollments.some((e) => e.programId === program.id);
      setAlreadyEnrolled(enrolled);
    });
  }, [user, program]);

  const handleEnroll = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!program || enrolling || alreadyEnrolled) return;

    setEnrolling(true);
    try {
      await enrollInProgram(user.uid, program);
      showToast("Successfully enrolled! Redirecting to your learning dashboard...");
      setAlreadyEnrolled(true);
      setTimeout(() => router.push("/learning"), 1500);
    } catch (err) {
      console.error("Enrollment failed:", err);
      showToast("Failed to enroll. Please try again.", "error");
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8">
          <div className="skeleton h-4 w-32 rounded mb-6" />
          <div className="skeleton h-10 w-3/4 rounded mb-4" />
          <div className="flex gap-2 mb-6">
            <div className="skeleton h-6 w-20 rounded-full" />
            <div className="skeleton h-6 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="skeleton h-40 rounded-2xl mb-4" />
              <div className="skeleton h-64 rounded-2xl" />
            </div>
            <div className="skeleton h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
          <Link
            href="/training"
            className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
          >
            &#8592; Back to Training
          </Link>
          <Card>
            <div style={{ padding: 48 }} className="text-center">
              <p className="text-4xl mb-3">&#128533;</p>
              <h3 className="text-lg font-bold text-text mb-2">
                Program not found
              </h3>
              <p className="text-sm text-text-muted">
                This training program may have been removed or the link is
                incorrect.
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const catStyle = getCategoryStyle(program.category);
  const enrollPercent =
    program.maxEnrollment != null
      ? Math.round((program.enrollmentCount / program.maxEnrollment) * 100)
      : null;

  return (
    <AppShell>
    <div className="min-h-screen bg-bg">
      <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8">
        {/* Back link */}
        <Link
          href="/training"
          className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
        >
          &#8592; Back to Training
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge
                  text={program.category}
                  color={catStyle.color}
                  bg={catStyle.bg}
                />
                <Badge
                  text={
                    program.format === "in-person"
                      ? "In-Person"
                      : program.format.charAt(0).toUpperCase() +
                        program.format.slice(1)
                  }
                  color={
                    program.format === "online"
                      ? "var(--blue)"
                      : program.format === "in-person"
                        ? "var(--green)"
                        : "var(--purple)"
                  }
                  bg={
                    program.format === "online"
                      ? "var(--blue-soft)"
                      : program.format === "in-person"
                        ? "var(--green-soft)"
                        : "var(--purple-soft)"
                  }
                />
                {program.certificateOffered && (
                  <Badge
                    text="Certificate"
                    color="var(--gold)"
                    bg="var(--gold-soft)"
                  />
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-text mb-2">
                {program.title}
              </h1>
            </div>

            {/* Instructor card */}
            {program.instructor && (
            <Card className="mb-6">
              <div style={{ padding: 20 }} className="flex items-center gap-4">
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0 text-white font-bold text-lg"
                  style={{
                    width: 56,
                    height: 56,
                    background:
                      "linear-gradient(135deg, var(--teal), var(--teal-light))",
                  }}
                >
                  {program.instructor.avatar ? (
                    <img
                      src={program.instructor.avatar}
                      alt={program.instructor.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    program.instructor.name?.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text">
                    {program.instructor.name}
                  </p>
                  <p className="text-xs text-text-sec mb-1">
                    {program.instructor.title}
                  </p>
                  <p className="text-xs text-text-muted line-clamp-2">
                    {program.instructor.bio}
                  </p>
                </div>
              </div>
            </Card>
            )}

            {/* Description */}
            <Card className="mb-6">
              <div style={{ padding: 20 }}>
                <h2 className="text-base font-bold text-text mb-3">
                  About This Program
                </h2>
                <p className="text-sm text-text-sec leading-relaxed whitespace-pre-line">
                  {program.description}
                </p>
              </div>
            </Card>

            {/* Details grid */}
            <Card className="mb-6">
              <div style={{ padding: 20 }}>
                <h2 className="text-base font-bold text-text mb-4">
                  Program Details
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-text-muted mb-1">Duration</p>
                    <p className="text-sm font-semibold text-text">
                      {program.duration}
                    </p>
                  </div>
                  {program.startDate && (
                    <div>
                      <p className="text-xs text-text-muted mb-1">
                        Start Date
                      </p>
                      <p className="text-sm font-semibold text-text">
                        {program.startDate}
                      </p>
                    </div>
                  )}
                  {program.endDate && (
                    <div>
                      <p className="text-xs text-text-muted mb-1">End Date</p>
                      <p className="text-sm font-semibold text-text">
                        {program.endDate}
                      </p>
                    </div>
                  )}
                  {program.location && program.format !== "online" && (
                    <div>
                      <p className="text-xs text-text-muted mb-1">Location</p>
                      <p className="text-sm font-semibold text-text">
                        {program.location}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-text-muted mb-1">Price</p>
                    <p
                      className="text-sm font-bold"
                      style={{
                        color:
                          program.price == null
                            ? "var(--green)"
                            : "var(--text)",
                      }}
                    >
                      {program.price == null
                        ? "Free"
                        : `$${program.price}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted mb-1">Modules</p>
                    <p className="text-sm font-semibold text-text">
                      {(program.modules || []).length}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Prerequisites */}
            {(program.prerequisites || []).length > 0 && (
              <Card className="mb-6">
                <div style={{ padding: 20 }}>
                  <h2 className="text-base font-bold text-text mb-3">
                    Prerequisites
                  </h2>
                  <ul className="list-disc pl-5 space-y-1">
                    {(program.prerequisites || []).map((prereq, i) => (
                      <li key={i} className="text-sm text-text-sec">
                        {prereq}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            )}

            {/* Skills */}
            {(program.skills || []).length > 0 && (
              <Card className="mb-6">
                <div style={{ padding: 20 }}>
                  <h2 className="text-base font-bold text-text mb-3">
                    Skills You&apos;ll Learn
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {(program.skills || []).map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{
                          background: "var(--teal-soft)",
                          color: "var(--teal)",
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Curriculum */}
            <Card className="mb-6">
              <div style={{ padding: 20 }}>
                <h2 className="text-base font-bold text-text mb-4">
                  Curriculum
                </h2>
                <div className="space-y-3">
                  {(program.modules || []).map((mod, i) => (
                    <div
                      key={i}
                      className="flex gap-3 p-3 rounded-xl"
                      style={{ background: "var(--bg)" }}
                    >
                      <div
                        className="flex items-center justify-center rounded-lg flex-shrink-0 text-sm font-bold"
                        style={{
                          width: 36,
                          height: 36,
                          background: "var(--teal-soft)",
                          color: "var(--teal)",
                        }}
                      >
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-text mb-0.5">
                          {mod.title}
                        </p>
                        <p className="text-xs text-text-muted mb-1">
                          {mod.description}
                        </p>
                        <span className="text-xs text-text-muted font-medium">
                          {mod.duration}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar (desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <EnrollSidebar
                program={program}
                enrollPercent={enrollPercent}
                alreadyEnrolled={alreadyEnrolled}
                enrolling={enrolling}
                user={user}
                onEnroll={handleEnroll}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA (mobile) */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-4"
        style={{
          background: "var(--card)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p
              className="text-lg font-bold"
              style={{
                color:
                  program.price == null ? "var(--green)" : "var(--text)",
              }}
            >
              {program.price == null ? "Free" : `$${program.price}`}
            </p>
            <p className="text-xs text-text-muted">
              {program.enrollmentCount} enrolled
            </p>
          </div>
          <Button
            primary
            onClick={handleEnroll}
            style={{
              background: alreadyEnrolled ? "var(--green)" : "var(--teal)",
              borderRadius: 14,
              opacity: enrolling ? 0.7 : 1,
            }}
          >
            {alreadyEnrolled
              ? "Already Enrolled"
              : enrolling
                ? "Enrolling..."
                : user
                  ? "Enroll Now"
                  : "Sign in to Enroll"}
          </Button>
        </div>
      </div>

      {/* Spacer for mobile bottom CTA */}
      <div className="lg:hidden h-20" />
    </div>
    </AppShell>
  );
}

function EnrollSidebar({
  program,
  enrollPercent,
  alreadyEnrolled,
  enrolling,
  user,
  onEnroll,
}: {
  program: TrainingProgram;
  enrollPercent: number | null;
  alreadyEnrolled: boolean;
  enrolling: boolean;
  user: unknown;
  onEnroll: () => void;
}) {
  return (
    <Card>
      <div style={{ padding: 24 }}>
        {/* Price */}
        <p
          className="text-2xl font-extrabold mb-4"
          style={{
            color:
              program.price == null ? "var(--green)" : "var(--text)",
          }}
        >
          {program.price == null ? "Free" : `$${program.price}`}
        </p>

        {/* Enrollment progress */}
        {program.maxEnrollment != null && enrollPercent != null && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-text-muted">Enrollment</span>
              <span className="text-xs font-semibold text-text-sec">
                {program.enrollmentCount}/{program.maxEnrollment}
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: "var(--border)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(enrollPercent, 100)}%`,
                  background: "var(--teal)",
                }}
              />
            </div>
          </div>
        )}

        {program.maxEnrollment == null && (
          <p className="text-xs text-text-muted mb-4">
            {program.enrollmentCount} already enrolled
          </p>
        )}

        {/* Enroll button */}
        <Button
          primary
          full
          onClick={onEnroll}
          style={{
            background: alreadyEnrolled ? "var(--green)" : "var(--teal)",
            borderRadius: 14,
            padding: "14px 24px",
            opacity: enrolling ? 0.7 : 1,
          }}
        >
          {alreadyEnrolled
            ? "Already Enrolled"
            : enrolling
              ? "Enrolling..."
              : user
                ? "Enroll Now"
                : "Sign in to Enroll"}
        </Button>

        {alreadyEnrolled && (
          <Link
            href="/learning"
            className="block text-center text-sm font-semibold mt-3 no-underline"
            style={{ color: "var(--teal)" }}
          >
            Go to My Learning &#8594;
          </Link>
        )}

        {/* Quick info */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="text-xs text-text-sec">{program.duration}</span>
          </div>
          <div className="flex items-center gap-3">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span className="text-xs text-text-sec">
              {(program.modules || []).length} modules
            </span>
          </div>
          {program.certificateOffered && (
            <div className="flex items-center gap-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
              </svg>
              <span className="text-xs text-text-sec">
                Certificate included
              </span>
            </div>
          )}
          {program.startDate && (
            <div className="flex items-center gap-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="text-xs text-text-sec">
                Starts {program.startDate}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
