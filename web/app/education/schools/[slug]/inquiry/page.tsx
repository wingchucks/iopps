"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getMemberProfile } from "@/lib/firestore/members";
import {
  getSchoolBySlug,
  getSchool,
  getEducationProgram,
  listSchoolPrograms,
  createSchoolInquiry,
  incrementEducationProgramInquiries,
} from "@/lib/firestore";
import type { School, EducationProgram } from "@/lib/types";
import {
  AcademicCapIcon,
  EnvelopeIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { FeedLayout } from "@/components/opportunity-graph";

export default function SchoolInquiryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const programId = searchParams.get("program");

  const { user, loading: authLoading } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [programs, setPrograms] = useState<EducationProgram[]>([]);
  const [selectedProgram, setSelectedProgram] =
    useState<EducationProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [interestedPrograms, setInterestedPrograms] = useState<string[]>([]);
  const [intendedStartDate, setIntendedStartDate] = useState("");
  const [educationLevel, setEducationLevel] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load school
        const schoolData =
          (await getSchoolBySlug(slug)) || (await getSchool(slug));
        if (schoolData) {
          setSchool(schoolData);

          // Load programs
          const programsData = await listSchoolPrograms(schoolData.id);
          setPrograms(programsData.filter((p) => p.isPublished));

          // If a program was specified, load it
          if (programId) {
            const program = await getEducationProgram(programId);
            if (program) {
              setSelectedProgram(program);
              setInterestedPrograms([program.id]);
              setSubject(`Inquiry about ${program.name}`);
            }
          }
        }

        // If user is logged in, try to get their profile
        if (user) {
          const profile = await getMemberProfile(user.uid);
          if (profile) {
            setName(profile.displayName || "");
          }
          setEmail(user.email || "");
        }
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug, programId, user]);

  const handleProgramToggle = (programId: string) => {
    setInterestedPrograms((prev) =>
      prev.includes(programId)
        ? prev.filter((id) => id !== programId)
        : [...prev, programId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;

    setError(null);
    setSending(true);

    try {
      await createSchoolInquiry({
        schoolId: school.id,
        programId: selectedProgram?.id,
        memberId: user?.uid || "anonymous",
        memberEmail: email,
        memberName: name,
        subject,
        message,
        interestedInPrograms:
          interestedPrograms.length > 0 ? interestedPrograms : undefined,
        intendedStartDate: intendedStartDate || undefined,
        educationLevel: educationLevel || undefined,
      });

      // Increment inquiry count on the program if one was selected
      if (selectedProgram) {
        await incrementEducationProgramInquiries(selectedProgram.id);
      }

      setSent(true);
    } catch (err) {
      console.error("Error sending inquiry:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send inquiry. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  if (authLoading || loading) {
    return (
      <FeedLayout activeNav="education" fullWidth>
        <div className="mx-auto max-w-2xl px-4 py-16">
          <p className="text-foreground0">Loading...</p>
        </div>
      </FeedLayout>
    );
  }

  if (!school) {
    return (
      <FeedLayout activeNav="education" fullWidth>
        <div className="mx-auto max-w-2xl px-4 py-16">
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <AcademicCapIcon className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              School Not Found
            </h2>
            <p className="mt-2 text-foreground0">
              We couldn&apos;t find the school you&apos;re looking for.
            </p>
            <Link
              href="/education/schools"
              className="mt-4 inline-block rounded-lg bg-accent px-6 py-2 font-semibold text-white hover:bg-[#0D9488]"
            >
              Browse Schools
            </Link>
          </div>
        </div>
      </FeedLayout>
    );
  }

  // Success state
  if (sent) {
    return (
      <FeedLayout activeNav="education" fullWidth>
        <div className="mx-auto max-w-2xl px-4 py-16">
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircleIcon className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Inquiry Sent!
            </h1>
            <p className="text-foreground0 mb-6">
              Your message has been sent to {school.name}. They will respond to
              you at <strong className="text-slate-900">{email}</strong>.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href={`/education/schools/${slug}`}
                className="rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-[#0D9488]"
              >
                Back to School Profile
              </Link>
              <Link
                href="/education/programs"
                className="rounded-lg border border-slate-200 px-6 py-3 text-slate-600 hover:bg-slate-100"
              >
                Explore Programs
              </Link>
            </div>
          </div>
        </div>
      </FeedLayout>
    );
  }

  return (
    <FeedLayout activeNav="education" fullWidth>
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/education/schools/${slug}`}
            className="inline-flex items-center gap-2 text-sm text-foreground0 hover:text-slate-900 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to {school.name}
          </Link>
          <div className="flex items-center gap-4 mb-4">
            {school.logoUrl ? (
              <img
                src={school.logoUrl}
                alt={school.name}
                className="h-14 w-14 rounded-xl object-cover border border-slate-200"
              />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-accent/10 flex items-center justify-center">
                <AcademicCapIcon className="h-7 w-7 text-[#14B8A6]" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Contact {school.name}
              </h1>
              <p className="text-sm text-foreground0">
                Send an inquiry about programs and admissions
              </p>
            </div>
          </div>
        </div>

        {/* Login prompt for non-authenticated users */}
        {!user && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <UserIcon className="h-5 w-5 text-foreground0" />
              <div className="flex-1">
                <p className="text-sm text-slate-600">
                  <Link
                    href={`/login?redirect=/education/schools/${slug}/inquiry${programId ? `?program=${programId}` : ""}`}
                    className="text-[#14B8A6] hover:text-[#0D9488]"
                  >
                    Sign in
                  </Link>{" "}
                  to track your inquiry and get faster responses.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Information */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <EnvelopeIcon className="h-5 w-5 text-[#14B8A6]" />
              Your Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg bg-white border border-slate-200 px-4 py-2 text-slate-900 focus:border-[#14B8A6] focus:outline-none"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg bg-white border border-slate-200 px-4 py-2 text-slate-900 focus:border-[#14B8A6] focus:outline-none"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>
          </div>

          {/* Programs of Interest */}
          {programs.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Programs of Interest
              </h2>
              <p className="text-sm text-foreground0 mb-4">
                Select the programs you&apos;re interested in learning more
                about.
              </p>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {programs.map((program) => (
                  <label
                    key={program.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:border-[#14B8A6]/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={interestedPrograms.includes(program.id)}
                      onChange={() => handleProgramToggle(program.id)}
                      className="h-5 w-5 rounded border-slate-300 bg-slate-100 text-[#14B8A6] focus:ring-[#14B8A6]"
                    />
                    <div>
                      <span className="block text-sm font-medium text-slate-900">
                        {program.name}
                      </span>
                      <span className="text-xs text-foreground0">
                        {program.credential}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Additional Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Additional Details
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Intended Start Term
                  </label>
                  <select
                    value={intendedStartDate}
                    onChange={(e) => setIntendedStartDate(e.target.value)}
                    className="w-full rounded-lg bg-white border border-slate-200 px-4 py-2 text-slate-900 focus:border-[#14B8A6] focus:outline-none"
                  >
                    <option value="">Select</option>
                    <option value="fall-2025">Fall 2025</option>
                    <option value="winter-2026">Winter 2026</option>
                    <option value="spring-2026">Spring 2026</option>
                    <option value="fall-2026">Fall 2026</option>
                    <option value="undecided">Undecided</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Current Education Level
                  </label>
                  <select
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    className="w-full rounded-lg bg-white border border-slate-200 px-4 py-2 text-slate-900 focus:border-[#14B8A6] focus:outline-none"
                  >
                    <option value="">Select</option>
                    <option value="high-school">High School</option>
                    <option value="upgrading">Upgrading/Adult Ed</option>
                    <option value="some-college">Some College/University</option>
                    <option value="diploma">Diploma/Certificate</option>
                    <option value="bachelors">Bachelor&apos;s Degree</option>
                    <option value="masters">Master&apos;s Degree</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Your Message
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg bg-white border border-slate-200 px-4 py-2 text-slate-900 focus:border-[#14B8A6] focus:outline-none"
                  placeholder="e.g., Questions about admissions"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Message *
                </label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-lg bg-white border border-slate-200 px-4 py-2 text-slate-900 focus:border-[#14B8A6] focus:outline-none"
                  placeholder="Tell us about yourself and what you'd like to know..."
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-4">
            <Link
              href={`/education/schools/${slug}`}
              className="rounded-lg border border-slate-200 px-6 py-2 text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={sending}
              className="rounded-lg bg-accent px-6 py-2 font-semibold text-white hover:bg-[#0D9488] disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send Inquiry"}
            </button>
          </div>
        </form>
      </div>
    </FeedLayout>
  );
}
