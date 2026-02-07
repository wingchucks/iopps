"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile } from "@/lib/firestore/employers";
import {
  getSchoolByOrganizationId,
  listSchoolInquiries,
  updateInquiryStatus,
} from "@/lib/firestore";
import type { School, SchoolInquiry } from "@/lib/types";
import {
  AcademicCapIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
  UserIcon,
  ClockIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

type InquiryStatus = "new" | "read" | "responded" | "archived";

export default function OrganizationEducationInquiriesPage() {
  const { user, role, loading } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [inquiries, setInquiries] = useState<SchoolInquiry[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filter, setFilter] = useState<InquiryStatus | "all">("all");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const profile = await getEmployerProfile(user.uid);
        if (profile) {
          const schoolData = await getSchoolByOrganizationId(profile.id);
          setSchool(schoolData);

          if (schoolData) {
            const inquiriesData = await listSchoolInquiries(schoolData.id);
            setInquiries(inquiriesData);
          }
        }
      } catch (err) {
        console.error("Error loading inquiries:", err);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [user]);

  const handleStatusUpdate = async (
    inquiryId: string,
    newStatus: InquiryStatus
  ) => {
    setUpdating(inquiryId);
    try {
      await updateInquiryStatus(inquiryId, newStatus);
      setInquiries((prev) =>
        prev.map((inq) =>
          inq.id === inquiryId ? { ...inq, status: newStatus } : inq
        )
      );
    } catch (err) {
      console.error("Error updating inquiry status:", err);
      toast.error("Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-300">
            <EnvelopeIcon className="h-3 w-3" />
            New
          </span>
        );
      case "read":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-300">
            <EnvelopeOpenIcon className="h-3 w-3" />
            Read
          </span>
        );
      case "responded":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-emerald-300">
            <CheckCircleIcon className="h-3 w-3" />
            Responded
          </span>
        );
      case "archived":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-700 px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
            <ArchiveBoxIcon className="h-3 w-3" />
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return "Unknown";
    const date =
      typeof timestamp === "object" &&
      timestamp !== null &&
      "toDate" in timestamp
        ? (timestamp as { toDate: () => Date }).toDate()
        : new Date(timestamp as string);
    return date.toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredInquiries =
    filter === "all"
      ? inquiries
      : inquiries.filter((inq) => inq.status === filter);

  const statusCounts = {
    all: inquiries.length,
    new: inquiries.filter((inq) => inq.status === "new").length,
    read: inquiries.filter((inq) => inq.status === "read").length,
    responded: inquiries.filter((inq) => inq.status === "responded").length,
    archived: inquiries.filter((inq) => inq.status === "archived").length,
  };

  if (loading || loadingData) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-[var(--text-muted)]">Loading...</p>
      </div>
    );
  }

  if (!user || role !== "employer") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Employer access required</h1>
        <p className="text-[var(--text-secondary)]">
          You need an employer account to view inquiries.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Login
        </Link>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-8 text-center">
          <AcademicCapIcon className="mx-auto h-12 w-12 text-slate-600" />
          <h2 className="mt-4 text-xl font-semibold text-white">
            No School Profile
          </h2>
          <p className="mt-2 text-[var(--text-muted)]">
            You need to create a school profile to receive inquiries.
          </p>
          <Link
            href="/organization/education"
            className="mt-4 inline-block rounded-lg bg-violet-500 px-6 py-2 font-semibold text-white hover:bg-violet-600"
          >
            Set Up School Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/organization/education"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-white mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Education
        </Link>
        <h1 className="text-2xl font-bold text-white">Student Inquiries</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          View and respond to inquiries from prospective students
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", "new", "read", "responded", "archived"] as const).map(
          (status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === status
                  ? "bg-violet-500 text-white"
                  : "bg-surface text-[var(--text-muted)] hover:text-white"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-2 rounded-full bg-slate-700/50 px-2 py-0.5 text-xs">
                {statusCounts[status]}
              </span>
            </button>
          )
        )}
      </div>

      {filteredInquiries.length === 0 ? (
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
            <EnvelopeIcon className="h-8 w-8 text-foreground0" />
          </div>
          <p className="text-[var(--text-muted)]">
            {filter === "all"
              ? "No inquiries yet. They will appear here when students reach out."
              : `No ${filter} inquiries.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInquiries.map((inquiry) => (
            <div
              key={inquiry.id}
              className={`rounded-xl border bg-surface p-6 ${
                inquiry.status === "new"
                  ? "border-violet-500/50"
                  : "border-[var(--card-border)]"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      {inquiry.memberName}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      {inquiry.memberEmail}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(inquiry.status)}
                  <div className="flex items-center gap-1 text-xs text-foreground0">
                    <ClockIcon className="h-3 w-3" />
                    {formatDate(inquiry.createdAt)}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-white mb-1">{inquiry.subject}</h4>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                  {inquiry.message}
                </p>
              </div>

              {inquiry.interestedInPrograms &&
                inquiry.interestedInPrograms.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-foreground0 mb-1">
                      Interested in programs:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {inquiry.interestedInPrograms.map((prog, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs text-violet-300"
                        >
                          {prog}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-[var(--card-border)]">
                {inquiry.status === "new" && (
                  <button
                    onClick={() => handleStatusUpdate(inquiry.id, "read")}
                    disabled={updating === inquiry.id}
                    className="rounded-lg bg-surface px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-slate-700 disabled:opacity-50"
                  >
                    Mark as Read
                  </button>
                )}
                {(inquiry.status === "new" || inquiry.status === "read") && (
                  <>
                    <a
                      href={`mailto:${inquiry.memberEmail}?subject=Re: ${inquiry.subject}`}
                      className="rounded-lg bg-violet-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-600"
                    >
                      Reply via Email
                    </a>
                    <button
                      onClick={() => handleStatusUpdate(inquiry.id, "responded")}
                      disabled={updating === inquiry.id}
                      className="rounded-lg bg-accent/20 px-3 py-1.5 text-sm text-accent hover:bg-accent/30 disabled:opacity-50"
                    >
                      Mark as Responded
                    </button>
                  </>
                )}
                {inquiry.status !== "archived" && (
                  <button
                    onClick={() => handleStatusUpdate(inquiry.id, "archived")}
                    disabled={updating === inquiry.id}
                    className="rounded-lg px-3 py-1.5 text-sm text-foreground0 hover:bg-surface hover:text-[var(--text-secondary)] disabled:opacity-50"
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
