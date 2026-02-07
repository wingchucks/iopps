"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  listUserServices,
  deleteService,
  listOrganizationGrants,
  deleteBusinessGrant,
} from "@/lib/firestore";
import type { Service, BusinessGrant } from "@/lib/types";
import {
  BuildingStorefrontIcon,
  WrenchScrewdriverIcon,
  BanknotesIcon,
  PlusIcon,
  EyeIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

// Import existing ShopTab as a sub-component
import ShopTab from "./ShopTab";

type BusinessType = "shop" | "services" | "funding";

interface BusinessTabProps {
  initialView?: BusinessType;
  onNavigate?: (tab: string) => void;
}

export default function BusinessTab({ initialView = "shop", onNavigate }: BusinessTabProps) {
  const { user } = useAuth();
  const [businessType, setBusinessType] = useState<BusinessType>(initialView);
  const [services, setServices] = useState<Service[]>([]);
  const [grants, setGrants] = useState<BusinessGrant[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync state if prop changes
  useEffect(() => {
    setBusinessType(initialView);
  }, [initialView]);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    if (!user) return;
    if (businessType === "services") loadServices();
    if (businessType === "funding") loadGrants();
  }, [user, businessType]);

  const loadServices = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await listUserServices(user.uid);
      setServices(data);
    } catch (err) {
      console.error("Error loading services:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadGrants = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await listOrganizationGrants(user.uid);
      setGrants(data);
    } catch (err) {
      console.error("Error loading grants:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = useMemo(() => {
    if (!keyword) return services;
    return services.filter((s) =>
      `${s.title} ${s.businessName} ${s.description}`.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [services, keyword]);

  const filteredGrants = useMemo(() => {
    if (!keyword) return grants;
    return grants.filter((g) =>
      `${g.title} ${g.provider} ${g.description}`.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [grants, keyword]);

  const handleDeleteService = async (serviceId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteService(serviceId);
      await loadServices();
    } catch (err) {
      console.error("Error deleting service:", err);
      toast.error("Failed to delete service");
    }
  };

  const handleDeleteGrant = async (grantId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteBusinessGrant(grantId);
      await loadGrants();
    } catch (err) {
      console.error("Error deleting grant:", err);
      toast.error("Failed to delete grant");
    }
  };

  // If showing Shop tab, render the existing ShopTab component
  if (businessType === "shop") {
    return (
      <div className="space-y-6">
        {/* Business Type Tabs */}
        <div className="flex gap-2 border-b border-[var(--card-border)] pb-px overflow-x-auto">
          <button
            onClick={() => setBusinessType("shop")}
            className="flex items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium transition-all whitespace-nowrap border-b-2 border-accent bg-accent/10 text-accent"
          >
            <BuildingStorefrontIcon className="h-4 w-4" />
            Shop Profile
          </button>
          <button
            onClick={() => setBusinessType("services")}
            className="flex items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium transition-all whitespace-nowrap border-b-2 border-transparent text-[var(--text-muted)] hover:border-[var(--card-border)] hover:text-[var(--text-secondary)]"
          >
            <WrenchScrewdriverIcon className="h-4 w-4" />
            Services ({services.length})
          </button>
          <button
            onClick={() => setBusinessType("funding")}
            className="flex items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium transition-all whitespace-nowrap border-b-2 border-transparent text-[var(--text-muted)] hover:border-[var(--card-border)] hover:text-[var(--text-secondary)]"
          >
            <BanknotesIcon className="h-4 w-4" />
            Funding ({grants.length})
          </button>
        </div>

        {/* Render existing ShopTab */}
        <ShopTab onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Business Type Tabs */}
      <div className="flex gap-2 border-b border-[var(--card-border)] pb-px overflow-x-auto">
        <button
          onClick={() => setBusinessType("shop")}
          className={`flex items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${(businessType as any) === "shop"
            ? "border-b-2 border-accent bg-accent/10 text-accent"
            : "border-b-2 border-transparent text-[var(--text-muted)] hover:border-[var(--card-border)] hover:text-[var(--text-secondary)]"
            }`}
        >
          <BuildingStorefrontIcon className="h-4 w-4" />
          Shop Profile
        </button>
        <button
          onClick={() => setBusinessType("services")}
          className={`flex items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${businessType === "services"
            ? "border-b-2 border-indigo-500 bg-indigo-500/10 text-indigo-400"
            : "border-b-2 border-transparent text-[var(--text-muted)] hover:border-[var(--card-border)] hover:text-[var(--text-secondary)]"
            }`}
        >
          <WrenchScrewdriverIcon className="h-4 w-4" />
          Services ({services.length})
        </button>
        <button
          onClick={() => setBusinessType("funding")}
          className={`flex items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${businessType === "funding"
            ? "border-b-2 border-accent bg-accent/10 text-accent"
            : "border-b-2 border-transparent text-[var(--text-muted)] hover:border-[var(--card-border)] hover:text-[var(--text-secondary)]"
            }`}
        >
          <BanknotesIcon className="h-4 w-4" />
          Funding ({grants.length})
        </button>
      </div>

      {/* Services Tab */}
      {businessType === "services" && (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search services..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full rounded-xl border border-[var(--card-border)] bg-surface px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <Link
              href="/organization/services/new"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25"
            >
              <PlusIcon className="h-5 w-5" />
              New Service
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-12 text-center">
              <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-4 text-lg font-semibold text-white">
                {keyword ? "No services found" : "No services yet"}
              </h3>
              <p className="mt-2 text-[var(--text-muted)]">
                {keyword ? "Try adjusting your search" : "List your professional services to connect with clients."}
              </p>
              {!keyword && (
                <Link
                  href="/organization/services/new"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add your first service
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="rounded-2xl border border-[var(--card-border)] bg-surface p-6 hover:border-[var(--card-border)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {service.title}
                      </h3>
                      <p className="mt-1 text-sm text-indigo-400">{service.businessName}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-300">
                          {service.category}
                        </span>
                        {service.location && (
                          <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                            {service.location}
                          </span>
                        )}
                        {service.verified && (
                          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-emerald-300">
                            Verified
                          </span>
                        )}
                      </div>
                      {service.tagline && (
                        <p className="mt-3 text-sm text-[var(--text-secondary)] line-clamp-2">
                          {service.tagline}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-4 text-xs text-foreground0">
                        <span>Views: {service.viewCount || 0}</span>
                        <span>Contact clicks: {service.contactClicks || 0}</span>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${service.status === "approved"
                        ? "bg-accent/20 text-accent"
                        : service.status === "pending"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-slate-700 text-[var(--text-muted)]"
                        }`}
                    >
                      {service.status === "approved" ? "Active" : service.status === "pending" ? "Pending" : "Draft"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-[var(--card-border)] pt-4">
                    <Link
                      href={`/organization/services/${service.id}/edit`}
                      className="rounded-lg px-3 py-1.5 text-sm text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                    >
                      <PencilSquareIcon className="inline h-4 w-4 mr-1" />
                      Edit
                    </Link>
                    {service.status === "approved" && (
                      <Link
                        href={`/business/services/${service.id}`}
                        className="rounded-lg px-3 py-1.5 text-sm text-blue-400 hover:bg-blue-500/10 transition-colors"
                      >
                        <EyeIcon className="inline h-4 w-4 mr-1" />
                        View public page
                      </Link>
                    )}
                    <button
                      onClick={() => handleDeleteService(service.id, service.title)}
                      className="rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Funding Tab */}
      {businessType === "funding" && (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search funding opportunities..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full rounded-xl border border-[var(--card-border)] bg-surface px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none"
              />
            </div>
            <Link
              href="/organization/funding/new"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25"
            >
              <PlusIcon className="h-5 w-5" />
              New Funding Opportunity
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            </div>
          ) : filteredGrants.length === 0 ? (
            <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-12 text-center">
              <BanknotesIcon className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-4 text-lg font-semibold text-white">
                {keyword ? "No funding opportunities found" : "No funding opportunities yet"}
              </h3>
              <p className="mt-2 text-[var(--text-muted)]">
                {keyword ? "Try adjusting your search" : "Share grants and funding opportunities for Indigenous businesses."}
              </p>
              {!keyword && (
                <Link
                  href="/organization/funding/new"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add your first funding opportunity
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGrants.map((grant) => (
                <div
                  key={grant.id}
                  className="rounded-2xl border border-[var(--card-border)] bg-surface p-6 hover:border-[var(--card-border)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {grant.title}
                      </h3>
                      <p className="mt-1 text-sm text-accent">{grant.provider}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-emerald-300 capitalize">
                          {grant.grantType.replace("_", " ")}
                        </span>
                        {grant.amount?.display && (
                          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-teal-300">
                            {grant.amount.display}
                          </span>
                        )}
                        {grant.deadline && (
                          <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                            Deadline:{" "}
                            {typeof grant.deadline === "string"
                              ? grant.deadline
                              : new Date(grant.deadline as any).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {grant.shortDescription && (
                        <p className="mt-3 text-sm text-[var(--text-secondary)] line-clamp-2">
                          {grant.shortDescription}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-4 text-xs text-foreground0">
                        <span>Views: {grant.viewCount || 0}</span>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${grant.status === "active"
                        ? "bg-accent/20 text-accent"
                        : grant.status === "upcoming"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-slate-700 text-[var(--text-muted)]"
                        }`}
                    >
                      {grant.status === "active" ? "Active" : grant.status === "upcoming" ? "Upcoming" : "Closed"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-[var(--card-border)] pt-4">
                    <Link
                      href={`/organization/funding/${grant.id}/edit`}
                      className="rounded-lg px-3 py-1.5 text-sm text-accent hover:bg-accent/10 transition-colors"
                    >
                      <PencilSquareIcon className="inline h-4 w-4 mr-1" />
                      Edit
                    </Link>
                    <Link
                      href={`/business/funding/${grant.id}`}
                      className="rounded-lg px-3 py-1.5 text-sm text-blue-400 hover:bg-blue-500/10 transition-colors"
                    >
                      <EyeIcon className="inline h-4 w-4 mr-1" />
                      View public page
                    </Link>
                    <button
                      onClick={() => handleDeleteGrant(grant.id, grant.title)}
                      className="rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
