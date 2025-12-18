"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { listEmployers, updateEmployerStatus, grantEmployerFreePosting, revokeEmployerFreePosting, getGrantConfig, getGrantRemainingCredits, isGrantValid, updateEmployerCarouselFeature } from "@/lib/firestore";
import { EmployerProfile, EmployerStatus, GrantType, FreePostingGrant } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  BuildingOfficeIcon,
  GiftIcon,
  EyeIcon,
  PlayCircleIcon,
  VideoCameraIcon,
  XMarkIcon,
  PencilSquareIcon,
  CurrencyDollarIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

type SortOption = "newest" | "oldest" | "name";

export default function AdminEmployersPage() {
  const { user, role } = useAuth();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [allEmployers, setAllEmployers] = useState<EmployerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  // Default to "all" if coming from search, otherwise "pending"
  const [filter, setFilter] = useState<EmployerStatus | "all">(initialSearch ? "all" : "pending");
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [freePostingModalId, setFreePostingModalId] = useState<string | null>(null);
  const [freePostingReason, setFreePostingReason] = useState("");
  const [grantType, setGrantType] = useState<GrantType>("single");
  const [grantQuantity, setGrantQuantity] = useState(1);
  const [grantDuration, setGrantDuration] = useState(365);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [previewModalId, setPreviewModalId] = useState<string | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFixingJobs, setIsFixingJobs] = useState(false);
  const [fixJobsResult, setFixJobsResult] = useState<{
    dryRun: boolean;
    checked: number;
    deactivated: number;
    jobs: Array<{ id: string; title: string; employerId: string; reason: string }>;
  } | null>(null);

  // Check admin access
  if (!loading && role !== "admin" && role !== "moderator") {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/20 p-8 text-center">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="mt-4 text-xl font-bold text-red-400">Unauthorized Access</h2>
        <p className="mt-2 text-slate-400">
          You do not have permission to access this page. Admin access required.
        </p>
      </div>
    );
  }

  const fetchEmployers = async () => {
    setLoading(true);
    try {
      const data = await listEmployers();
      setAllEmployers(data);
    } catch (error) {
      console.error("Failed to fetch employers:", error);
      showToast("error", "Failed to load employers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployers();
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleApprove = async (employerId: string, employerName: string, employerEmail?: string) => {
    if (!user) return;
    if (!confirm(`Are you sure you want to approve "${employerName}"?`)) return;

    setProcessingId(employerId);
    try {
      await updateEmployerStatus(employerId, "approved", user.uid);

      // Send approval email to employer (fire and forget)
      if (employerEmail) {
        const idToken = await user.getIdToken();
        fetch("/api/emails/send-approval", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            to: employerEmail,
            organizationName: employerName,
            status: "approved",
          }),
        }).catch((err) => {
          console.error("Failed to send approval email:", err);
        });
      }

      await fetchEmployers();
      showToast("success", `${employerName} has been approved${employerEmail ? " and notified via email" : ""}`);
    } catch (error) {
      console.error("Failed to approve employer:", error);
      showToast("error", "Failed to approve employer");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (employerId: string, employerName: string) => {
    setRejectModalId(employerId);
  };

  const confirmReject = async (employerId: string, employerName: string, employerEmail?: string) => {
    if (!rejectionReason.trim()) {
      showToast("error", "Please provide a rejection reason");
      return;
    }

    setProcessingId(employerId);
    try {
      await updateEmployerStatus(
        employerId,
        "rejected",
        undefined,
        rejectionReason
      );

      // Send rejection email to employer (fire and forget)
      if (employerEmail) {
        const idToken = await user!.getIdToken();
        fetch("/api/emails/send-approval", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            to: employerEmail,
            organizationName: employerName,
            status: "rejected",
            rejectionReason,
          }),
        }).catch((err) => {
          console.error("Failed to send rejection email:", err);
        });
      }

      await fetchEmployers();
      showToast("success", `${employerName} has been rejected${employerEmail ? " and notified via email" : ""}`);
      setRejectModalId(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Failed to reject employer:", error);
      showToast("error", "Failed to reject employer");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevoke = async (employerId: string, employerName: string) => {
    if (!confirm(`Revoke approval for "${employerName}"? This will set their status to pending.`)) return;

    setProcessingId(employerId);
    try {
      await updateEmployerStatus(employerId, "pending");
      await fetchEmployers();
      showToast("success", `Approval revoked for ${employerName}`);
    } catch (error) {
      console.error("Failed to revoke approval:", error);
      showToast("error", "Failed to revoke approval");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReconsider = async (employerId: string, employerName: string) => {
    if (!confirm(`Reconsider rejection for "${employerName}"? This will set their status to pending.`)) return;

    setProcessingId(employerId);
    try {
      await updateEmployerStatus(employerId, "pending");
      await fetchEmployers();
      showToast("success", `${employerName} is now pending review`);
    } catch (error) {
      console.error("Failed to reconsider:", error);
      showToast("error", "Failed to update status");
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleFreePosting = async (employer: EmployerProfile) => {
    if (!user) return;

    if (employer.freePostingEnabled) {
      // Revoke free posting
      if (!confirm(`Revoke free posting access for "${employer.organizationName}"?`)) return;
      setProcessingId(employer.id);
      try {
        await revokeEmployerFreePosting(employer.id);
        await fetchEmployers();
        showToast("success", `Free posting revoked for ${employer.organizationName}`);
      } catch (error) {
        console.error("Failed to revoke free posting:", error);
        showToast("error", "Failed to revoke free posting");
      } finally {
        setProcessingId(null);
      }
    } else {
      // Open modal to grant free posting
      setFreePostingModalId(employer.id);
      setFreePostingReason("");
      setGrantType("single");
      setGrantQuantity(1);
      setGrantDuration(365);
    }
  };

  const confirmGrantFreePosting = async (employerId: string, employerName: string) => {
    if (!user) return;
    setProcessingId(employerId);
    try {
      await grantEmployerFreePosting({
        userId: employerId,
        adminId: user.uid,
        grantType,
        reason: freePostingReason || undefined,
        quantity: grantQuantity,
        durationDays: grantDuration,
      });
      await fetchEmployers();
      const config = getGrantConfig(grantType);
      showToast("success", `${config.label} granted to ${employerName}`);
      setFreePostingModalId(null);
      setFreePostingReason("");
    } catch (error) {
      console.error("Failed to grant free posting:", error);
      showToast("error", "Failed to grant free posting");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteEmployer = async (employerId: string) => {
    if (!user) return;

    try {
      setIsDeleting(true);
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/delete-employer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ employerId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete employer");
      }

      // Remove employer from local state
      setAllEmployers((prev) => prev.filter((e) => e.id !== employerId));
      setDeleteModalId(null);
      showToast("success", "Employer and associated user deleted successfully");
    } catch (error) {
      console.error("Error deleting employer:", error);
      showToast("error", error instanceof Error ? error.message : "Failed to delete employer");
    } finally {
      setIsDeleting(false);
    }
  };

const handleFixJobs = async (dryRun: boolean = true, employerId?: string) => {
    if (!user) return;

    try {
      setIsFixingJobs(true);
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/fix-employer-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ dryRun, employerId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fix jobs");
      }

      const result = await response.json();
      setFixJobsResult({
        dryRun: result.dryRun,
        checked: result.checked,
        deactivated: result.deactivated,
        jobs: result.jobs,
      });

      if (!dryRun && result.deactivated > 0) {
        showToast("success", `Deactivated ${result.deactivated} jobs from unapproved employers`);
      }
    } catch (error) {
      console.error("Error fixing jobs:", error);
      showToast("error", error instanceof Error ? error.message : "Failed to fix jobs");
    } finally {
      setIsFixingJobs(false);
    }
  };

  const handleToggleCarouselFeature = async (employer: EmployerProfile) => {
    const currentlyFeatured = (employer as any).featuredOnCarousel;
    const newValue = !currentlyFeatured;

    setProcessingId(employer.id);
    try {
      await updateEmployerCarouselFeature(employer.id, newValue);
      await fetchEmployers();
      showToast(
        "success",
        newValue
          ? `${employer.organizationName} added to Partner Carousel`
          : `${employer.organizationName} removed from Partner Carousel`
      );
    } catch (error) {
      console.error("Failed to toggle carousel feature:", error);
      showToast("error", "Failed to update carousel feature");
    } finally {
      setProcessingId(null);
    }
  };

  // Get estimated value for display
  const getGrantValue = () => {
    switch (grantType) {
      case "single":
        return `$${(125 * grantQuantity).toLocaleString()} value`;
      case "featured":
        return `$${(300 * grantQuantity).toLocaleString()} value`;
      case "tier1":
        return "$1,250 value";
      case "tier2":
        return "$2,500 value";
      default:
        return "";
    }
  };

  // Get grant badge label
  const getGrantLabel = (grant: FreePostingGrant | undefined): string => {
    if (!grant) return "Free Posting";

    const remaining = getGrantRemainingCredits(grant);

    if (grant.unlimitedPosts) {
      return "Unlimited Posts";
    }

    switch (grant.grantType) {
      case "single":
        return `${remaining.jobCredits} Free Post${remaining.jobCredits !== 1 ? "s" : ""}`;
      case "featured":
        return `${remaining.featuredCredits} Featured`;
      case "tier1":
        return "Tier 1 Plan";
      case "tier2":
        return "Tier 2 Plan";
      default:
        return "Free Posting";
    }
  };

  // Get grant tooltip with details
  const getGrantTooltip = (grant: FreePostingGrant | undefined): string => {
    if (!grant) return "Legacy free posting enabled";

    const remaining = getGrantRemainingCredits(grant);
    const lines: string[] = [];

    const config = getGrantConfig(grant.grantType);
    lines.push(`Package: ${config.label}`);

    if (grant.unlimitedPosts) {
      lines.push("Unlimited job posts");
    } else if (remaining.jobCredits > 0) {
      lines.push(`Job posts remaining: ${remaining.jobCredits}`);
    }

    if (remaining.featuredCredits > 0) {
      lines.push(`Featured ads remaining: ${remaining.featuredCredits}`);
    }

    if (grant.expiresAt) {
      const expiresDate = grant.expiresAt instanceof Date
        ? grant.expiresAt
        : (grant.expiresAt as any).toDate?.() || new Date(grant.expiresAt as unknown as string);
      lines.push(`Expires: ${expiresDate.toLocaleDateString()}`);
    }

    if (grant.reason) {
      lines.push(`Reason: ${grant.reason}`);
    }

    return lines.join("\n");
  };

  // Filter and search employers
  const filteredEmployers = useMemo(() => {
    let result = allEmployers;

    // Apply status filter
    if (filter !== "all") {
      result = result.filter((emp) => (emp.status || "pending") === filter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (emp) =>
          emp.id?.toLowerCase().includes(query) ||
          emp.organizationName?.toLowerCase().includes(query) ||
          emp.location?.toLowerCase().includes(query) ||
          emp.website?.toLowerCase().includes(query) ||
          emp.description?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      if (sortBy === "newest") {
        return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
      } else if (sortBy === "oldest") {
        return (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0);
      } else {
        // name
        return (a.organizationName || "").localeCompare(b.organizationName || "");
      }
    });

    return result;
  }, [allEmployers, filter, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredEmployers.length / itemsPerPage);
  const paginatedEmployers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEmployers.slice(start, start + itemsPerPage);
  }, [filteredEmployers, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = allEmployers.length;
    const pending = allEmployers.filter((e) => (e.status || "pending") === "pending").length;
    const approved = allEmployers.filter((e) => e.status === "approved").length;
    const rejected = allEmployers.filter((e) => e.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [allEmployers]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown";
    try {
      return timestamp.toDate().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  const getStatusBadge = (status?: EmployerStatus) => {
    const actualStatus = status || "pending";
    const styles = {
      pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      approved: "bg-green-500/10 text-green-400 border-green-500/20",
      rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    };

    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[actualStatus]}`}
      >
        {actualStatus === "pending" && <ClockIcon className="mr-1 h-3 w-3" />}
        {actualStatus === "approved" && <CheckCircleIcon className="mr-1 h-3 w-3" />}
        {actualStatus === "rejected" && <XCircleIcon className="mr-1 h-3 w-3" />}
        {actualStatus.charAt(0).toUpperCase() + actualStatus.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Employer Management</h1>
        <p className="mt-1 text-slate-400">
          Review and manage employer access to the IOPPS platform.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-[#08090C] p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-teal-500/10 p-3">
              <BuildingOfficeIcon className="h-6 w-6 text-teal-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Total Employers</p>
              <p className="text-2xl font-bold text-slate-100">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#08090C] p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-yellow-500/10 p-3">
              <ClockIcon className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Pending</p>
              <p className="text-2xl font-bold text-slate-100">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#08090C] p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-green-500/10 p-3">
              <CheckCircleIcon className="h-6 w-6 text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Approved</p>
              <p className="text-2xl font-bold text-slate-100">{stats.approved}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#08090C] p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-red-500/10 p-3">
              <XCircleIcon className="h-6 w-6 text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Rejected</p>
              <p className="text-2xl font-bold text-slate-100">{stats.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Tools - Fix Jobs */}
      {role === "admin" && (
        <div className="rounded-lg border border-slate-800 bg-[#08090C] p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-medium text-slate-200">Maintenance Tools</h3>
              <p className="text-sm text-slate-400">Find and deactivate jobs from unapproved employers</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleFixJobs(true)}
                disabled={isFixingJobs}
                className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isFixingJobs ? "Checking..." : "Check Jobs (Dry Run)"}
              </button>
              {fixJobsResult && fixJobsResult.dryRun && fixJobsResult.deactivated > 0 && (
                <button
                  onClick={() => handleFixJobs(false)}
                  disabled={isFixingJobs}
                  className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Fix {fixJobsResult.deactivated} Jobs
                </button>
              )}
            </div>
          </div>

          {/* Fix Jobs Results */}
          {fixJobsResult && (
            <div className="mt-4 rounded-md border border-slate-700 bg-slate-800/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">
                    {fixJobsResult.dryRun ? "Would deactivate" : "Deactivated"}{" "}
                    <span className="font-bold text-amber-400">{fixJobsResult.deactivated}</span> of{" "}
                    <span className="font-bold">{fixJobsResult.checked}</span> active jobs
                  </p>
                  {fixJobsResult.dryRun && fixJobsResult.deactivated > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      Click &quot;Fix Jobs&quot; to deactivate these jobs
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setFixJobsResult(null)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {fixJobsResult.jobs.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="pb-2 text-left">Job Title</th>
                        <th className="pb-2 text-left">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-400">
                      {fixJobsResult.jobs.map((job) => (
                        <tr key={job.id} className="border-t border-slate-700/50">
                          <td className="py-1.5">{job.title}</td>
                          <td className="py-1.5">
                            <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-400">
                              {job.reason.replace(/_/g, " ")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex rounded-lg bg-slate-800 p-1">
          {(["all", "pending", "approved", "rejected"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors ${
                filter === status
                  ? "bg-teal-500 text-slate-900 shadow-lg"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search and Sort */}
        <div className="flex gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search employers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 sm:w-64"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-slate-400">
        Showing {paginatedEmployers.length} of {filteredEmployers.length} employers
      </div>

      {/* Employer List */}
      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-slate-800 bg-[#08090C] p-12">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-teal-500"></div>
            <p className="mt-3 text-slate-400">Loading employers...</p>
          </div>
        </div>
      ) : paginatedEmployers.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-[#08090C] p-12 text-center">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-slate-600" />
          <h3 className="mt-4 text-lg font-medium text-slate-300">No employers found</h3>
          <p className="mt-2 text-sm text-slate-500">
            {searchQuery
              ? "No employer profiles match your search. The user may not have completed their employer profile setup yet."
              : `No ${filter !== "all" ? filter : ""} employers at this time`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedEmployers.map((employer) => {
            const isExpanded = expandedId === employer.id;
            const status = employer.status || "pending";

            return (
              <div
                key={employer.id}
                className="overflow-hidden rounded-lg border border-slate-800 bg-[#08090C] transition-all hover:border-slate-700"
              >
                <div className="p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    {/* Left: Logo and Info */}
                    <div className="flex gap-4">
                      {employer.logoUrl ? (
                        <img
                          src={employer.logoUrl}
                          alt={`${employer.organizationName} logo`}
                          className="h-16 w-16 flex-shrink-0 rounded-lg border border-slate-700 bg-white object-contain p-2"
                        />
                      ) : (
                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-500">
                          No Logo
                        </div>
                      )}

                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-bold text-slate-100">
                            {employer.organizationName || "Unnamed Organization"}
                          </h3>
                          {getStatusBadge(employer.status)}
                          {employer.freePostingEnabled && (
                            <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400" title={getGrantTooltip(employer.freePostingGrant)}>
                              <GiftIcon className="mr-1 h-3 w-3" />
                              {getGrantLabel(employer.freePostingGrant)}
                            </span>
                          )}
                          {(employer as any).featuredOnCarousel && (
                            <span className="inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-400" title="Featured on homepage Partner Carousel">
                              <SparklesIcon className="mr-1 h-3 w-3" />
                              Carousel
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                          {employer.location && (
                            <span className="flex items-center gap-1">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {employer.location}
                            </span>
                          )}
                          {employer.website && (
                            <a
                              href={employer.website.startsWith("http") ? employer.website : `https://${employer.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-teal-400 hover:text-teal-300"
                            >
                              {employer.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                            </a>
                          )}
                          <span className="flex items-center gap-1">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Joined {formatDate(employer.createdAt)}
                          </span>
                        </div>

                        {employer.description && (
                          <p className={`text-sm text-slate-400 ${!isExpanded && "line-clamp-2"}`}>
                            {employer.description}
                          </p>
                        )}

                        {/* Status-specific info */}
                        {status === "approved" && employer.approvedAt && (
                          <p className="text-xs text-green-400">
                            Approved on {formatDate(employer.approvedAt)}
                            {employer.approvedBy && ` by ${employer.approvedBy}`}
                          </p>
                        )}
                        {status === "rejected" && employer.rejectionReason && (
                          <div className="rounded-md bg-red-950/30 p-3 text-sm">
                            <p className="font-medium text-red-400">Rejection Reason:</p>
                            <p className="mt-1 text-red-300">{employer.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col gap-2 lg:flex-shrink-0">
                      {/* View Profile Button */}
                      <button
                        onClick={() => setPreviewModalId(employer.id)}
                        className="flex items-center justify-center gap-2 rounded-md bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-400 transition-colors hover:bg-teal-500/20"
                      >
                        <EyeIcon className="h-4 w-4" />
                        View Profile
                      </button>

                      {/* Edit & Products Buttons */}
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/employers/${employer.id}/edit`}
                          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-teal-500 hover:text-teal-400"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                          Edit
                        </Link>
                        <Link
                          href={`/admin/employers/${employer.id}/products`}
                          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-emerald-500 hover:text-emerald-400"
                        >
                          <CurrencyDollarIcon className="h-4 w-4" />
                          Products
                        </Link>
                      </div>

                      {status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(employer.id, employer.organizationName, employer.contactEmail)}
                            disabled={!!processingId}
                            className="flex items-center justify-center gap-2 rounded-md bg-green-500/10 px-4 py-2 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(employer.id, employer.organizationName)}
                            disabled={!!processingId}
                            className="flex items-center justify-center gap-2 rounded-md bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <XCircleIcon className="h-4 w-4" />
                            Reject
                          </button>
                        </>
                      )}

                      {status === "approved" && (
                        <button
                          onClick={() => handleRevoke(employer.id, employer.organizationName)}
                          disabled={!!processingId}
                          className="flex items-center justify-center gap-2 rounded-md bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-400 transition-colors hover:bg-yellow-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <XCircleIcon className="h-4 w-4" />
                          Revoke Approval
                        </button>
                      )}

                      {status === "rejected" && (
                        <button
                          onClick={() => handleReconsider(employer.id, employer.organizationName)}
                          disabled={!!processingId}
                          className="flex items-center justify-center gap-2 rounded-md bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-400 transition-colors hover:bg-teal-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          Reconsider
                        </button>
                      )}

                      {/* Free Posting Toggle - Only for approved employers */}
                      {status === "approved" && (
                        <button
                          onClick={() => handleToggleFreePosting(employer)}
                          disabled={!!processingId}
                          className={`flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            employer.freePostingEnabled
                              ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                              : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                          }`}
                        >
                          <GiftIcon className="h-4 w-4" />
                          {employer.freePostingEnabled ? "Revoke Free Posting" : "Grant Free Posting"}
                        </button>
                      )}

                      {/* Partner Carousel Toggle - Only for approved employers with logos */}
                      {status === "approved" && employer.logoUrl && (
                        <button
                          onClick={() => handleToggleCarouselFeature(employer)}
                          disabled={!!processingId}
                          className={`flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            (employer as any).featuredOnCarousel
                              ? "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                              : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                          }`}
                        >
                          <SparklesIcon className="h-4 w-4" />
                          {(employer as any).featuredOnCarousel ? "Remove from Carousel" : "Feature on Carousel"}
                        </button>
                      )}

                      {employer.description && employer.description.length > 100 && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : employer.id)}
                          className="flex items-center justify-center gap-1 rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-300"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUpIcon className="h-4 w-4" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDownIcon className="h-4 w-4" />
                              View Details
                            </>
                          )}
                        </button>
                      )}

                      {/* Delete Employer - Admin only */}
                      {role === "admin" && (
                        <button
                          onClick={() => setDeleteModalId(employer.id)}
                          disabled={!!processingId}
                          className="flex items-center justify-center gap-2 rounded-md border border-red-800 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:border-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <XCircleIcon className="h-4 w-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h3 className="text-xl font-bold text-slate-100">Reject Employer</h3>
            <p className="mt-2 text-sm text-slate-400">
              Please provide a reason for rejecting this employer. This will be visible to them.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              className="mt-4 w-full rounded-md border border-slate-700 bg-slate-800 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setRejectModalId(null);
                  setRejectionReason("");
                }}
                className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const employer = allEmployers.find((e) => e.id === rejectModalId);
                  if (employer) {
                    confirmReject(rejectModalId, employer.organizationName, employer.contactEmail);
                  }
                }}
                disabled={!rejectionReason.trim() || !!processingId}
                className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Free Posting Modal */}
      {freePostingModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <GiftIcon className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-100">Grant Free Posting</h3>
                <p className="text-sm text-emerald-400">{getGrantValue()}</p>
              </div>
            </div>

            {/* Package Selection */}
            <div className="mt-5">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Select Package
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "single", label: "Single Job Post", price: "$125" },
                  { value: "featured", label: "Featured Job Ad", price: "$300" },
                  { value: "tier1", label: "Tier 1 – Basic", price: "$1,250/yr" },
                  { value: "tier2", label: "Tier 2 – Unlimited", price: "$2,500/yr" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setGrantType(option.value as GrantType)}
                    className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${
                      grantType === option.value
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-700 bg-slate-800 hover:border-slate-600"
                    }`}
                  >
                    <span className={`text-sm font-medium ${grantType === option.value ? "text-emerald-400" : "text-slate-200"}`}>
                      {option.label}
                    </span>
                    <span className="text-xs text-slate-500">{option.price}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity (for single/featured) */}
            {(grantType === "single" || grantType === "featured") && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setGrantQuantity(Math.max(1, grantQuantity - 1))}
                    className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-300 hover:bg-slate-700"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={grantQuantity}
                    onChange={(e) => setGrantQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-center text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setGrantQuantity(grantQuantity + 1)}
                    className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-300 hover:bg-slate-700"
                  >
                    +
                  </button>
                  <span className="text-sm text-slate-400">
                    {grantType === "single" ? "job posts" : "featured ads"}
                  </span>
                </div>
              </div>
            )}

            {/* Duration */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Duration (days)
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={grantDuration}
                  onChange={(e) => setGrantDuration(parseInt(e.target.value))}
                  className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>6 months</option>
                  <option value={365}>1 year</option>
                  <option value={730}>2 years</option>
                </select>
              </div>
            </div>

            {/* Reason */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Reason (optional)
              </label>
              <input
                type="text"
                value={freePostingReason}
                onChange={(e) => setFreePostingReason(e.target.value)}
                placeholder="e.g., Partner, Promotion, Sponsorship"
                className="w-full rounded-md border border-slate-700 bg-slate-800 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Summary */}
            <div className="mt-4 rounded-md border border-slate-700 bg-slate-800/50 p-3">
              <p className="text-sm text-slate-400">
                <span className="text-slate-200 font-medium">Granting: </span>
                {grantType === "single" && `${grantQuantity} job post${grantQuantity > 1 ? "s" : ""}`}
                {grantType === "featured" && `${grantQuantity} featured ad${grantQuantity > 1 ? "s" : ""}`}
                {grantType === "tier1" && "Tier 1 (15 jobs + 15 featured)"}
                {grantType === "tier2" && "Tier 2 (unlimited posts + 5 featured)"}
                {" "}for {grantDuration} days
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setFreePostingModalId(null);
                  setFreePostingReason("");
                }}
                className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const employer = allEmployers.find((e) => e.id === freePostingModalId);
                  if (employer) {
                    confirmGrantFreePosting(freePostingModalId, employer.organizationName);
                  }
                }}
                disabled={!!processingId}
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processingId ? "Granting..." : "Grant Package"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Profile Preview Modal */}
      {previewModalId && (() => {
        const employer = allEmployers.find((e) => e.id === previewModalId);
        if (!employer) return null;
        const status = employer.status || "pending";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
              {/* Header */}
              <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-700 bg-slate-900 p-6">
                <div className="flex gap-4">
                  {employer.logoUrl ? (
                    <img
                      src={employer.logoUrl}
                      alt={`${employer.organizationName} logo`}
                      className="h-16 w-16 flex-shrink-0 rounded-lg border border-slate-700 bg-white object-contain p-2"
                    />
                  ) : (
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-500">
                      No Logo
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-slate-100">
                      {employer.organizationName || "Unnamed Organization"}
                    </h3>
                    <div className="mt-1">{getStatusBadge(employer.status)}</div>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewModalId(null)}
                  className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="space-y-3">
                  {employer.location && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{employer.location}</span>
                    </div>
                  )}
                  {employer.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <a
                        href={employer.website.startsWith("http") ? employer.website : `https://${employer.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-400 hover:text-teal-300"
                      >
                        {employer.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        <ArrowTopRightOnSquareIcon className="ml-1 inline h-3 w-3" />
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <ClockIcon className="h-4 w-4 text-slate-500" />
                    <span>Joined {formatDate(employer.createdAt)}</span>
                  </div>
                </div>

                {/* Description */}
                {employer.description && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200 mb-2">About</h4>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{employer.description}</p>
                  </div>
                )}

                {/* Company Intro Video */}
                {employer.companyIntroVideo && (
                  <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <PlayCircleIcon className="h-5 w-5 text-purple-400" />
                      <h4 className="text-sm font-semibold text-purple-300">Company Intro Video</h4>
                    </div>
                    <p className="text-sm text-slate-300">
                      {employer.companyIntroVideo.title || "Video available"}
                    </p>
                    {employer.companyIntroVideo.videoUrl && (
                      <a
                        href={employer.companyIntroVideo.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                      >
                        Watch video <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                {/* Interviews */}
                {employer.interviews && employer.interviews.length > 0 && (
                  <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <VideoCameraIcon className="h-5 w-5 text-teal-400" />
                      <h4 className="text-sm font-semibold text-teal-300">
                        Interviews & Videos ({employer.interviews.length})
                      </h4>
                    </div>
                    <ul className="space-y-1">
                      {employer.interviews.map((interview, idx) => (
                        <li key={idx} className="text-sm text-slate-300 flex items-center gap-2">
                          <span className="text-slate-500">•</span>
                          {interview.title || `Video ${idx + 1}`}
                          {interview.isIOPPSInterview && (
                            <span className="rounded bg-teal-500/20 px-1.5 py-0.5 text-xs text-teal-400">IOPPS</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Rejection reason if rejected */}
                {status === "rejected" && employer.rejectionReason && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                    <h4 className="text-sm font-semibold text-red-300 mb-2">Rejection Reason</h4>
                    <p className="text-sm text-red-200">{employer.rejectionReason}</p>
                  </div>
                )}
              </div>

              {/* Footer with Actions */}
              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-700 bg-slate-900 p-6">
                {status === "pending" && (
                  <>
                    <button
                      onClick={() => {
                        setPreviewModalId(null);
                        handleApprove(employer.id, employer.organizationName, employer.contactEmail);
                      }}
                      disabled={!!processingId}
                      className="flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setPreviewModalId(null);
                        handleReject(employer.id, employer.organizationName);
                      }}
                      disabled={!!processingId}
                      className="flex items-center gap-2 rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <XCircleIcon className="h-4 w-4" />
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => setPreviewModalId(null)}
                  className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Confirmation Modal */}
      {deleteModalId && (() => {
        const employer = allEmployers.find((e) => e.id === deleteModalId);
        if (!employer) return null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-100">Delete Employer</h3>
              <p className="mt-2 text-slate-400">
                Are you sure you want to delete <span className="font-medium text-slate-200">{employer.organizationName}</span>?
              </p>
              <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                <strong>Warning:</strong> This will permanently delete:
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Employer profile</li>
                  <li>All job postings by this employer</li>
                  <li>All conferences by this employer</li>
                  <li>All scholarships by this employer</li>
                  <li>The associated user account</li>
                </ul>
                <p className="mt-2 font-medium">This action cannot be undone easily.</p>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setDeleteModalId(null)}
                  disabled={isDeleting}
                  className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteEmployer(deleteModalId)}
                  disabled={isDeleting}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete Employer"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div
            className={`rounded-lg border px-6 py-4 shadow-lg ${
              toastMessage.type === "success"
                ? "border-green-500/50 bg-green-950/90 text-green-400"
                : "border-red-500/50 bg-red-950/90 text-red-400"
            }`}
          >
            <div className="flex items-center gap-3">
              {toastMessage.type === "success" ? (
                <CheckCircleIcon className="h-5 w-5" />
              ) : (
                <XCircleIcon className="h-5 w-5" />
              )}
              <p className="font-medium">{toastMessage.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
