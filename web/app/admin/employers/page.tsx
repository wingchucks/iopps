"use client";

import { useEffect, useState, useMemo } from "react";
import { listEmployers, updateEmployerStatus, grantEmployerFreePosting, revokeEmployerFreePosting } from "@/lib/firestore";
import { EmployerProfile, EmployerStatus } from "@/lib/types";
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
} from "@heroicons/react/24/outline";

type SortOption = "newest" | "oldest" | "name";

export default function AdminEmployersPage() {
  const { user, role } = useAuth();
  const [allEmployers, setAllEmployers] = useState<EmployerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<EmployerStatus | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [freePostingModalId, setFreePostingModalId] = useState<string | null>(null);
  const [freePostingReason, setFreePostingReason] = useState("");
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [previewModalId, setPreviewModalId] = useState<string | null>(null);

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

  const handleApprove = async (employerId: string, employerName: string) => {
    if (!user) return;
    if (!confirm(`Are you sure you want to approve "${employerName}"?`)) return;

    setProcessingId(employerId);
    try {
      await updateEmployerStatus(employerId, "approved", user.uid);
      await fetchEmployers();
      showToast("success", `${employerName} has been approved`);
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

  const confirmReject = async (employerId: string, employerName: string) => {
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
      await fetchEmployers();
      showToast("success", `${employerName} has been rejected`);
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
    }
  };

  const confirmGrantFreePosting = async (employerId: string, employerName: string) => {
    if (!user) return;
    setProcessingId(employerId);
    try {
      await grantEmployerFreePosting(employerId, user.uid, freePostingReason || undefined);
      await fetchEmployers();
      showToast("success", `Free posting granted to ${employerName}`);
      setFreePostingModalId(null);
      setFreePostingReason("");
    } catch (error) {
      console.error("Failed to grant free posting:", error);
      showToast("error", "Failed to grant free posting");
    } finally {
      setProcessingId(null);
    }
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
              ? "Try adjusting your search query"
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
                            <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                              <GiftIcon className="mr-1 h-3 w-3" />
                              Free Posting
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

                      {status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(employer.id, employer.organizationName)}
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
                    confirmReject(rejectModalId, employer.organizationName);
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
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <GiftIcon className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">Grant Free Posting</h3>
            </div>
            <p className="mt-3 text-sm text-slate-400">
              This employer will be able to post jobs without payment. Optionally add a reason for your records.
            </p>
            <input
              type="text"
              value={freePostingReason}
              onChange={(e) => setFreePostingReason(e.target.value)}
              placeholder="e.g., Partner, Promotion, Sponsorship (optional)"
              className="mt-4 w-full rounded-md border border-slate-700 bg-slate-800 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
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
                Grant Free Posting
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
                        handleApprove(employer.id, employer.organizationName);
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
