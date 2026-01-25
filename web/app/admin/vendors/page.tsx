"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  collection,
  query,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { grantVendorFreeListing, revokeVendorFreeListing } from "@/lib/firestore";
import type { Vendor } from "@/lib/types";
import {
  AdminLoadingState,
  AdminEmptyState,
  StatusBadge,
  EntityActionsMenu,
  ConfirmationModal,
  type ActionItem,
  type ActionGroup,
} from "@/components/admin";
import {
  CurrencyDollarIcon,
  StarIcon,
  EyeIcon,
  GiftIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

function AdminVendorsContent() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");

  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "inactive" | "featured">(
    statusFilter === "pending"
      ? "pending"
      : statusFilter === "active"
        ? "active"
        : statusFilter === "inactive"
          ? "inactive"
          : statusFilter === "featured"
            ? "featured"
            : "all"
  );
  const [processing, setProcessing] = useState<string | null>(null);
  const [freeListingModalId, setFreeListingModalId] = useState<string | null>(null);
  const [freeListingReason, setFreeListingReason] = useState("");

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: "danger" | "warning" | "success" | "info";
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "danger",
    confirmText: "Confirm",
    onConfirm: () => {},
  });

  const openConfirmModal = (config: Omit<typeof confirmModal, "isOpen">) => {
    setConfirmModal({ ...config, isOpen: true });
  };

  const closeConfirmModal = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user || (role !== "admin" && role !== "moderator")) {
      router.push("/");
      return;
    }

    loadVendors();
  }, [user, role, authLoading, router]);

  async function loadVendors() {
    try {
      setLoading(true);

      // Get all vendors
      const vendorsRef = collection(db!, "vendors");
      const vendorsSnap = await getDocs(
        query(vendorsRef, orderBy("createdAt", "desc"))
      );

      const vendorsList: Vendor[] = vendorsSnap.docs.map((doc) => {
        const data = doc.data() as Vendor;
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate ? (data.createdAt as any).toDate() : null,
          updatedAt: data.updatedAt?.toDate ? (data.updatedAt as any).toDate() : null,
        } as Vendor;
      });

      setVendors(vendorsList);
    } catch (error) {
      console.error("Error loading vendors:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleVendorStatus(vendorId: string, isCurrentlyActive: boolean) {
    if (!user) return;

    try {
      setProcessing(vendorId);
      const vendorRef = doc(db!, "vendors", vendorId);
      const newStatus = isCurrentlyActive ? "suspended" : "active";
      await updateDoc(vendorRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setVendors((prev) =>
        prev.map((vendor) =>
          vendor.id === vendorId ? { ...vendor, status: newStatus as Vendor['status'] } : vendor
        )
      );
    } catch (error) {
      console.error("Error toggling vendor status:", error);
      toast.error("Failed to update vendor status. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  async function approveVendor(vendorId: string) {
    if (!user) return;

    try {
      setProcessing(vendorId);
      const vendorRef = doc(db!, "vendors", vendorId);
      await updateDoc(vendorRef, {
        status: "active",
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setVendors((prev) =>
        prev.map((vendor) =>
          vendor.id === vendorId ? { ...vendor, status: "active" as Vendor['status'] } : vendor
        )
      );
    } catch (error) {
      console.error("Error approving vendor:", error);
      toast.error("Failed to approve vendor. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  async function rejectVendor(vendorId: string, vendorName: string) {
    if (!user) return;

    try {
      setProcessing(vendorId);
      const vendorRef = doc(db!, "vendors", vendorId);
      await updateDoc(vendorRef, {
        status: "draft",
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setVendors((prev) =>
        prev.map((vendor) =>
          vendor.id === vendorId ? { ...vendor, status: "draft" as Vendor['status'] } : vendor
        )
      );
    } catch (error) {
      console.error("Error rejecting vendor:", error);
      toast.error("Failed to reject vendor. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  async function toggleFeaturedStatus(vendorId: string, currentFeatured: boolean) {
    if (!user) return;

    try {
      setProcessing(vendorId);
      const vendorRef = doc(db!, "vendors", vendorId);
      await updateDoc(vendorRef, {
        featured: !currentFeatured,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setVendors((prev) =>
        prev.map((vendor) =>
          vendor.id === vendorId
            ? { ...vendor, featured: !currentFeatured }
            : vendor
        )
      );
    } catch (error) {
      console.error("Error toggling featured status:", error);
      toast.error("Failed to update featured status. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  async function deleteVendor(vendorId: string, vendorName: string) {
    if (!user) return;

    try {
      setProcessing(vendorId);
      const vendorRef = doc(db!, "vendors", vendorId);
      await deleteDoc(vendorRef);

      // Update local state
      setVendors((prev) => prev.filter((vendor) => vendor.id !== vendorId));
    } catch (error) {
      console.error("Error deleting vendor:", error);
      toast.error("Failed to delete vendor. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  async function handleToggleFreeListing(vendor: Vendor) {
    if (!user) return;

    if (vendor.freeListingEnabled) {
      // Revoke free listing
      const confirmed = confirm(
        `Revoke free listing access for "${vendor.businessName}"?`
      );
      if (!confirmed) return;

      try {
        setProcessing(vendor.id);
        await revokeVendorFreeListing(vendor.id);
        setVendors((prev) =>
          prev.map((v) =>
            v.id === vendor.id
              ? { ...v, freeListingEnabled: false, freeListingReason: undefined }
              : v
          )
        );
      } catch (error) {
        console.error("Error revoking free listing:", error);
        toast.error("Failed to revoke free listing. Please try again.");
      } finally {
        setProcessing(null);
      }
    } else {
      // Open modal to grant free listing
      setFreeListingModalId(vendor.id);
      setFreeListingReason("");
    }
  }

  async function confirmGrantFreeListing(vendorId: string) {
    if (!user) return;

    try {
      setProcessing(vendorId);
      await grantVendorFreeListing(vendorId, user.uid, freeListingReason || undefined);
      setVendors((prev) =>
        prev.map((v) =>
          v.id === vendorId
            ? { ...v, freeListingEnabled: true, freeListingReason: freeListingReason || "Admin granted" }
            : v
        )
      );
      setFreeListingModalId(null);
      setFreeListingReason("");
    } catch (error) {
      console.error("Error granting free listing:", error);
      toast.error("Failed to grant free listing. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  if (authLoading || loading) {
    return <AdminLoadingState message="Loading vendors..." />;
  }

  if (!user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  const filteredVendors = vendors.filter((vendor) => {
    if (filter === "all") return true;
    if (filter === "pending") return vendor.status === "pending";
    if (filter === "active") return vendor.status === "active";
    if (filter === "inactive") return vendor.status === "draft" || vendor.status === "suspended";
    if (filter === "featured") return vendor.featured === true;
    return true;
  });

  const pendingCount = vendors.filter((v) => v.status === "pending").length;
  const activeCount = vendors.filter((v) => v.status === "active").length;
  const inactiveCount = vendors.filter((v) => v.status === "draft" || v.status === "suspended").length;
  const featuredCount = vendors.filter((v) => v.featured === true).length;
  const paidCount = vendors.filter((v) => v.subscriptionStatus === "active").length;
  const freeCount = vendors.filter((v) => v.freeListingEnabled === true).length;

  function getSubscriptionBadge(vendor: Vendor) {
    if (vendor.freeListingEnabled) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-400">
          <GiftIcon className="h-3 w-3" />
          Free Grant
        </span>
      );
    }
    if (vendor.subscriptionStatus === "active") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
          <CurrencyDollarIcon className="h-3 w-3" />
          Subscribed
        </span>
      );
    }
    if (vendor.subscriptionStatus === "past_due") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
          Past Due
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-medium text-slate-400">
        No Subscription
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-[#020306]">
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#08090C]">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin"
                className="text-sm text-slate-400 hover:text-[#14B8A6]"
              >
                ← Admin Dashboard
              </Link>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">
                Shop Indigenous - Vendors
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {filteredVendors.length} vendor{filteredVendors.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-slate-800 bg-[#08090C] p-4">
            <p className="text-sm font-medium text-slate-400">Total</p>
            <p className="mt-1 text-2xl font-bold text-slate-100">{vendors.length}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#08090C] p-4">
            <p className="text-sm font-medium text-slate-400">Pending</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">{pendingCount}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#08090C] p-4">
            <p className="text-sm font-medium text-slate-400">Active</p>
            <p className="mt-1 text-2xl font-bold text-green-400">{activeCount}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#08090C] p-4">
            <p className="text-sm font-medium text-slate-400">Featured</p>
            <p className="mt-1 text-2xl font-bold text-yellow-400">{featuredCount}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#08090C] p-4">
            <p className="text-sm font-medium text-slate-400">Paid Subs</p>
            <p className="mt-1 text-2xl font-bold text-teal-400">{paidCount}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#08090C] p-4">
            <p className="text-sm font-medium text-slate-400">Free Grants</p>
            <p className="mt-1 text-2xl font-bold text-purple-400">{freeCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "all"
              ? "bg-[#14B8A6] text-slate-900"
              : "border border-slate-700 text-slate-300 hover:border-[#14B8A6]"
              }`}
          >
            All ({vendors.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "pending"
              ? "bg-amber-500 text-slate-900"
              : "border border-slate-700 text-slate-300 hover:border-amber-500"
              } ${pendingCount > 0 ? "animate-pulse" : ""}`}
          >
            Pending Review ({pendingCount})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "active"
              ? "bg-green-500 text-slate-900"
              : "border border-slate-700 text-slate-300 hover:border-green-500"
              }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilter("inactive")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "inactive"
              ? "bg-slate-500 text-slate-900"
              : "border border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
          >
            Inactive ({inactiveCount})
          </button>
          <button
            onClick={() => setFilter("featured")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "featured"
              ? "bg-yellow-500 text-slate-900"
              : "border border-slate-700 text-slate-300 hover:border-yellow-500"
              }`}
          >
            Featured ({featuredCount})
          </button>
        </div>

        {/* Vendors List */}
        <div className="space-y-4">
          {filteredVendors.length === 0 ? (
            <AdminEmptyState
              title="No vendors found"
              message="No vendors match the current filter."
            />
          ) : (
            filteredVendors.map((vendor) => {
              const isProcessing = processing === vendor.id;
              const isActive = vendor.status === "active";
              const isFeatured = vendor.featured === true;

              return (
                <div
                  key={vendor.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    {/* Vendor Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        {vendor.logoUrl && (
                          <img
                            src={vendor.logoUrl}
                            alt={vendor.businessName}
                            className="h-16 w-16 rounded-lg border border-slate-700 object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-semibold text-slate-50">
                                {vendor.businessName}
                              </h3>
                              {vendor.tagline && (
                                <p className="mt-1 text-sm text-slate-400">
                                  {vendor.tagline}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex gap-2">
                                <StatusBadge status={vendor.status === "pending" ? "pending" : isActive ? "active" : "inactive"} />
                                {vendor.status === "pending" && (
                                  <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                                    Needs Review
                                  </span>
                                )}
                                {isFeatured && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-400">
                                    <StarIcon className="h-3 w-3" />
                                    Featured
                                  </span>
                                )}
                              </div>
                              {getSubscriptionBadge(vendor)}
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-400">
                            {vendor.location && (
                              <span className="flex items-center gap-1">
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
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                                {vendor.location}
                              </span>
                            )}
                            {vendor.category && (
                              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400">
                                {vendor.category}
                              </span>
                            )}
                            {vendor.nation && (
                              <span className="rounded-full bg-[#14B8A6]/10 px-2 py-0.5 text-xs text-[#14B8A6]">
                                {vendor.nation}
                              </span>
                            )}
                            {vendor.offersShipping && (
                              <span className="text-xs text-slate-500">
                                Offers Shipping
                              </span>
                            )}
                          </div>

                          {vendor.description && (
                            <p className="mt-3 text-sm text-slate-300 line-clamp-2">
                              {vendor.description}
                            </p>
                          )}

                          {vendor.website && (
                            <a
                              href={vendor.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-block text-sm text-[#14B8A6] hover:underline"
                            >
                              {vendor.website}
                            </a>
                          )}

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                            {typeof vendor.viewCount === 'number' && (
                              <span className="flex items-center gap-1">
                                <EyeIcon className="h-3.5 w-3.5" />
                                {vendor.viewCount.toLocaleString()} views
                              </span>
                            )}
                            {vendor.createdAt && (
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="h-3.5 w-3.5" />
                                Listed:{" "}
                                {(vendor.createdAt as unknown as Date).toLocaleDateString?.() ??
                                  (typeof vendor.createdAt === 'object' && 'toDate' in vendor.createdAt
                                    ? (vendor.createdAt as any).toDate().toLocaleDateString()
                                    : '')}
                              </span>
                            )}
                            {vendor.region && <span>Region: {vendor.region}</span>}
                            {vendor.subscriptionEndsAt && (
                              <span className="text-teal-400">
                                Subscription expires:{" "}
                                {typeof vendor.subscriptionEndsAt === 'object' && 'toDate' in vendor.subscriptionEndsAt
                                  ? (vendor.subscriptionEndsAt as any).toDate().toLocaleDateString()
                                  : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/shop/${vendor.slug}`}
                        className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6] text-center"
                      >
                        View
                      </Link>

                      <EntityActionsMenu
                        actions={(() => {
                          const actions: (ActionItem | ActionGroup)[] = [];

                          // Moderation actions for pending vendors
                          if (vendor.status === "pending") {
                            actions.push({
                              id: `moderation-${vendor.id}`,
                              items: [
                                {
                                  id: `approve-${vendor.id}`,
                                  label: "Approve",
                                  onClick: () => approveVendor(vendor.id),
                                  variant: "success",
                                  disabled: isProcessing,
                                },
                                {
                                  id: `reject-${vendor.id}`,
                                  label: "Reject",
                                  onClick: () => {
                                    openConfirmModal({
                                      title: "Reject Vendor",
                                      message: `Reject "${vendor.businessName}"? This will return the listing to draft status.`,
                                      variant: "danger",
                                      confirmText: "Reject",
                                      onConfirm: () => rejectVendor(vendor.id, vendor.businessName),
                                    });
                                  },
                                  variant: "danger",
                                  disabled: isProcessing,
                                },
                              ],
                            });
                          }

                          // Status & visibility actions
                          const statusItems: ActionItem[] = [];

                          if (vendor.status !== "pending") {
                            statusItems.push({
                              id: `toggle-status-${vendor.id}`,
                              label: isActive ? "Deactivate" : "Activate",
                              onClick: () => toggleVendorStatus(vendor.id, isActive),
                              disabled: isProcessing,
                            });
                          }

                          statusItems.push({
                            id: `toggle-featured-${vendor.id}`,
                            label: isFeatured ? "Remove from Featured" : "Add to Featured",
                            onClick: () => toggleFeaturedStatus(vendor.id, isFeatured),
                            disabled: isProcessing,
                          });

                          statusItems.push({
                            id: `toggle-free-${vendor.id}`,
                            label: vendor.freeListingEnabled
                              ? "Revoke Free Listing"
                              : "Grant Free Listing",
                            onClick: () => handleToggleFreeListing(vendor),
                            disabled: isProcessing,
                          });

                          actions.push({
                            id: `status-${vendor.id}`,
                            items: statusItems,
                          });

                          // Danger zone
                          actions.push({
                            id: `danger-${vendor.id}`,
                            items: [
                              {
                                id: `delete-${vendor.id}`,
                                label: "Delete Vendor",
                                onClick: () => {
                                  openConfirmModal({
                                    title: "Delete Vendor",
                                    message: `Are you sure you want to delete "${vendor.businessName}"? This action cannot be undone.`,
                                    variant: "danger",
                                    confirmText: "Delete",
                                    onConfirm: () => deleteVendor(vendor.id, vendor.businessName),
                                  });
                                },
                                variant: "danger",
                                disabled: isProcessing,
                              },
                            ],
                          });

                          return actions;
                        })()}
                        processing={isProcessing}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={() => {
          confirmModal.onConfirm();
          closeConfirmModal();
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
      />

      {/* Free Listing Modal */}
      {freeListingModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-100">Grant Free Listing</h3>
            </div>
            <p className="mt-3 text-sm text-slate-400">
              This vendor will have their shop listing active without requiring a subscription. Optionally add a reason for your records.
            </p>
            <input
              type="text"
              value={freeListingReason}
              onChange={(e) => setFreeListingReason(e.target.value)}
              placeholder="e.g., Partner, Promotion, Sponsorship (optional)"
              className="mt-4 w-full rounded-md border border-slate-700 bg-slate-800 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setFreeListingModalId(null);
                  setFreeListingReason("");
                }}
                className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmGrantFreeListing(freeListingModalId)}
                disabled={!!processing}
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Grant Free Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminVendorsPage() {
  return (
    <Suspense fallback={<AdminLoadingState message="Loading vendors..." />}>
      <AdminVendorsContent />
    </Suspense>
  );
}
