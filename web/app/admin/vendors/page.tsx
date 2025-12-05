"use client";

import { useEffect, useState } from "react";
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
import type { Vendor } from "@/lib/types";

import { Suspense } from "react";

function AdminVendorsContent() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");

  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "featured">(
    statusFilter === "active"
      ? "active"
      : statusFilter === "inactive"
        ? "inactive"
        : statusFilter === "featured"
          ? "featured"
          : "all"
  );
  const [processing, setProcessing] = useState<string | null>(null);

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
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
          approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate() : null,
        } as VendorProfile;
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
      alert("Failed to update vendor status. Please try again.");
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
      alert("Failed to update featured status. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  async function deleteVendor(vendorId: string, vendorName: string) {
    if (!user) return;

    const confirmed = confirm(
      `Are you sure you want to delete the vendor "${vendorName}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setProcessing(vendorId);
      const vendorRef = doc(db!, "vendors", vendorId);
      await deleteDoc(vendorRef);

      // Update local state
      setVendors((prev) => prev.filter((vendor) => vendor.id !== vendorId));
    } catch (error) {
      console.error("Error deleting vendor:", error);
      alert("Failed to delete vendor. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020306] px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-400">Loading vendors...</p>
        </div>
      </div>
    );
  }

  if (!user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  const filteredVendors = vendors.filter((vendor) => {
    if (filter === "all") return true;
    if (filter === "active") return vendor.status === "active";
    if (filter === "inactive") return vendor.status !== "active";
    if (filter === "featured") return vendor.featured === true;
    return true;
  });

  const activeCount = vendors.filter((v) => v.status === "active").length;
  const inactiveCount = vendors.filter((v) => v.status !== "active").length;
  const featuredCount = vendors.filter((v) => v.featured === true).length;

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
                Vendors Moderation
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
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
              <p className="text-slate-400">No vendors found for this filter.</p>
            </div>
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
                            <div className="flex gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${isActive
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-slate-500/10 text-slate-400"
                                  }`}
                              >
                                {isActive ? "Active" : "Inactive"}
                              </span>
                              {isFeatured && (
                                <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-400">
                                  Featured
                                </span>
                              )}
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

                          <div className="mt-3 flex gap-4 text-xs text-slate-500">
                            {vendor.createdAt && (
                              <span>
                                Listed:{" "}
                                {vendor.createdAt && new Date(vendor.createdAt).toLocaleDateString()}
                              </span>
                            )}
                            {vendor.region && <span>Region: {vendor.region}</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 lg:flex-col">
                      <Link
                        href={`/shop/${vendor.slug}`}
                        className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6] text-center"
                      >
                        View Vendor
                      </Link>

                      <button
                        onClick={() => toggleVendorStatus(vendor.id, isActive)}
                        disabled={isProcessing}
                        className={`rounded-md px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${isActive
                          ? "border border-slate-600 text-slate-400 hover:bg-slate-800"
                          : "bg-green-600 text-white hover:bg-green-500"
                          }`}
                      >
                        {isProcessing
                          ? "Processing..."
                          : isActive
                            ? "Deactivate"
                            : "Activate"}
                      </button>

                      <button
                        onClick={() => toggleFeaturedStatus(vendor.id, isFeatured)}
                        disabled={isProcessing}
                        className={`rounded-md px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${isFeatured
                          ? "bg-yellow-600 text-white hover:bg-yellow-500"
                          : "border border-yellow-600 text-yellow-400 hover:bg-yellow-600/10"
                          }`}
                      >
                        {isProcessing
                          ? "Processing..."
                          : isFeatured
                            ? "Unfeature"
                            : "Feature"}
                      </button>

                      <button
                        onClick={() => deleteVendor(vendor.id, vendor.businessName)}
                        disabled={isProcessing}
                        className="rounded-md border border-red-500 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminVendorsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020306] px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-400">Loading vendors...</p>
        </div>
      </div>
    }>
      <AdminVendorsContent />
    </Suspense>
  );
}
