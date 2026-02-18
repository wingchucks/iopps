"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getUserEnrollments,
  type TrainingEnrollment,
} from "@/lib/firestore/training";

function formatDate(ts: unknown): string {
  if (!ts || typeof ts !== "object") return "";
  const d = ts as { seconds?: number };
  if (!d.seconds) return "";
  const date = new Date(d.seconds * 1000);
  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function LearningPage() {
  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <LearningContent />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}

function LearningContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserEnrollments(user.uid)
      .then(setEnrollments)
      .catch((err) => console.error("Failed to load enrollments:", err))
      .finally(() => setLoading(false));
  }, [user]);

  const inProgress = useMemo(
    () =>
      enrollments.filter(
        (e) => e.status === "enrolled" || e.status === "in-progress"
      ),
    [enrollments]
  );

  const completed = useMemo(
    () => enrollments.filter((e) => e.status === "completed"),
    [enrollments]
  );

  const stats = useMemo(
    () => ({
      enrolled: enrollments.length,
      completed: completed.length,
      certificates: completed.filter((e) => e.certificateUrl).length,
    }),
    [enrollments, completed]
  );

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
        <div className="skeleton h-4 w-32 rounded mb-6" />
        <div className="skeleton h-8 w-48 rounded mb-4" />
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-6 w-32 rounded mb-4" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8 pb-24">
      {/* Back link */}
      <Link
        href="/profile"
        className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
      >
        &#8592; Back to Profile
      </Link>

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text mb-1">
            My Learning
          </h1>
          <p className="text-sm text-text-muted m-0">
            Track your training progress
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <Card>
          <div style={{ padding: 16 }} className="text-center">
            <p
              className="text-2xl font-extrabold"
              style={{ color: "var(--teal)" }}
            >
              {stats.enrolled}
            </p>
            <p className="text-xs text-text-muted">Enrolled</p>
          </div>
        </Card>
        <Card>
          <div style={{ padding: 16 }} className="text-center">
            <p
              className="text-2xl font-extrabold"
              style={{ color: "var(--green)" }}
            >
              {stats.completed}
            </p>
            <p className="text-xs text-text-muted">Completed</p>
          </div>
        </Card>
        <Card>
          <div style={{ padding: 16 }} className="text-center">
            <p
              className="text-2xl font-extrabold"
              style={{ color: "var(--gold)" }}
            >
              {stats.certificates}
            </p>
            <p className="text-xs text-text-muted">Certificates</p>
          </div>
        </Card>
      </div>

      {/* In Progress */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-text mb-4">In Progress</h2>
        {inProgress.length === 0 ? (
          <Card>
            <div style={{ padding: 32 }} className="text-center">
              <p className="text-3xl mb-2">&#128218;</p>
              <h3 className="text-sm font-bold text-text mb-1">
                No programs in progress
              </h3>
              <p className="text-xs text-text-muted mb-3">
                Browse training programs to start learning.
              </p>
              <Link href="/training">
                <Button
                  primary
                  small
                  style={{ background: "var(--teal)", borderRadius: 12 }}
                >
                  Browse Training
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {inProgress.map((enrollment) => (
              <Card key={enrollment.id}>
                <div style={{ padding: 20 }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-text mb-1">
                        {enrollment.programTitle}
                      </p>
                      <p className="text-xs text-text-muted">
                        {(enrollment.completedModules || []).length} of{" "}
                        {enrollment.totalModules} modules completed
                      </p>
                    </div>
                    <span
                      className="text-xs font-bold flex-shrink-0"
                      style={{ color: "var(--teal)" }}
                    >
                      {enrollment.progress}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div
                    className="h-2 rounded-full overflow-hidden mb-3"
                    style={{ background: "var(--border)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${enrollment.progress}%`,
                        background: "var(--teal)",
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    {Boolean(enrollment.enrolledAt) && (
                      <span className="text-xs text-text-muted">
                        Enrolled {formatDate(enrollment.enrolledAt)}
                      </span>
                    )}
                    <Link
                      href="/training"
                      className="text-xs font-semibold no-underline"
                      style={{ color: "var(--teal)" }}
                    >
                      Continue Learning &#8594;
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Completed */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-text mb-4">Completed</h2>
        {completed.length === 0 ? (
          <Card>
            <div style={{ padding: 32 }} className="text-center">
              <p className="text-3xl mb-2">&#127942;</p>
              <h3 className="text-sm font-bold text-text mb-1">
                No completions yet
              </h3>
              <p className="text-xs text-text-muted">
                Keep learning to earn your first completion.
              </p>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {completed.map((enrollment) => (
              <Card key={enrollment.id}>
                <div style={{ padding: 20 }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-text mb-1">
                        {enrollment.programTitle}
                      </p>
                      <p className="text-xs text-text-muted">
                        Completed{" "}
                        {enrollment.completedAt
                          ? formatDate(enrollment.completedAt)
                          : ""}
                      </p>
                    </div>
                    <div
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold flex-shrink-0"
                      style={{
                        background: "var(--green-soft)",
                        color: "var(--green)",
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Complete
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => {
                        if (enrollment.certificateUrl) {
                          window.open(enrollment.certificateUrl, "_blank");
                        } else {
                          showToast("Certificate not yet available", "info");
                        }
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all"
                      style={{
                        background: "var(--gold-soft)",
                        color: "var(--gold)",
                      }}
                    >
                      Download Certificate
                    </button>
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/training/${enrollment.programId || enrollment.id}`;
                        navigator.clipboard.writeText(link).then(() => {
                          showToast("Link copied!", "success");
                        });
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all"
                      style={{
                        background: "var(--border)",
                        color: "var(--text-sec)",
                      }}
                    >
                      Share
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Saved Training */}
      <section>
        <h2 className="text-lg font-bold text-text mb-4">Saved Training</h2>
        <Card>
          <div style={{ padding: 32 }} className="text-center">
            <p className="text-3xl mb-2">&#128278;</p>
            <h3 className="text-sm font-bold text-text mb-1">
              No saved training programs
            </h3>
            <p className="text-xs text-text-muted mb-3">
              Save programs you are interested in from the Training Hub.
            </p>
            <Link href="/training">
              <Button
                primary
                small
                style={{ background: "var(--teal)", borderRadius: 12 }}
              >
                Browse Training &#8594;
              </Button>
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
