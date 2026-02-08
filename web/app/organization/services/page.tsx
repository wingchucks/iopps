"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { listUserServices, deleteService } from "@/lib/firestore";
import type { Service } from "@/lib/types";
import {
  BriefcaseIcon,
  MapPinIcon,
  GlobeAltIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  CheckBadgeIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function OrganizationServicesPage() {
  const { user, loading } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadServices = async () => {
      try {
        const data = await listUserServices(user.uid);
        setServices(data);
      } catch (err) {
        console.error("Error loading services:", err);
      } finally {
        setLoadingServices(false);
      }
    };

    loadServices();
  }, [user]);

  const handleDelete = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service listing? This action cannot be undone."))
      return;

    setDeleting(serviceId);
    try {
      await deleteService(serviceId);
      setServices((prev) => prev.filter((s) => s.id !== serviceId));
    } catch (err) {
      console.error("Error deleting service:", err);
      toast.error("Failed to delete service");
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadge = (service: Service) => (
    <StatusBadge status={service.status} />
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-[var(--text-muted)]">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Sign in required</h1>
        <p className="text-[var(--text-secondary)]">
          You need to be signed in to manage your services.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your Services
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Manage your professional service listings
          </p>
        </div>
        <Link
          href="/organization/services/new"
          className="rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white hover:from-indigo-600 hover:to-purple-600 transition-colors"
        >
          + List New Service
        </Link>
      </div>

      {/* Info Banner */}
      <div className="mt-6 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
        <div className="flex items-start gap-3">
          <BriefcaseIcon className="h-5 w-5 text-indigo-400 mt-0.5" />
          <div>
            <p className="text-sm text-indigo-200">
              List your professional services to connect with clients across North America.
              Services are reviewed before being published to ensure quality.
            </p>
          </div>
        </div>
      </div>

      {loadingServices ? (
        <div className="mt-8 text-[var(--text-muted)]">Loading services...</div>
      ) : services.length === 0 ? (
        <div className="mt-8 rounded-xl border border-[var(--card-border)] bg-surface p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
            <BriefcaseIcon className="h-8 w-8 text-foreground0" />
          </div>
          <p className="text-[var(--text-muted)]">
            You haven&apos;t listed any services yet.
          </p>
          <Link
            href="/organization/services/new"
            className="mt-4 inline-block rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white"
          >
            List your first service
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="rounded-xl border border-[var(--card-border)] bg-surface p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {service.featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                        <StarIcon className="h-3 w-3" />
                        Featured
                      </span>
                    )}
                    {service.verified && (
                      <CheckBadgeIcon className="h-5 w-5 text-indigo-400" />
                    )}
                    <h3 className="text-lg font-semibold text-white">
                      {service.title}
                    </h3>
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">{service.businessName}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-300">
                      {service.category}
                    </span>
                    {service.location && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                        <MapPinIcon className="h-3 w-3" />
                        {service.location}
                      </span>
                    )}
                    {service.servesRemote && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                        <GlobeAltIcon className="h-3 w-3" />
                        Remote
                      </span>
                    )}
                    {service.freeConsultation && (
                      <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-300">
                        Free Consultation
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {getStatusBadge(service)}
                  <Link
                    href={`/organization/services/${service.id}/edit`}
                    className="rounded-md px-3 py-1 text-sm text-[var(--text-secondary)] hover:bg-slate-700/50"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(service.id)}
                    disabled={deleting === service.id}
                    className="rounded-md px-3 py-1 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {deleting === service.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>

              {service.tagline && (
                <p className="mt-3 text-sm text-[var(--text-secondary)] line-clamp-2">
                  {service.tagline}
                </p>
              )}

              {/* Stats */}
              <div className="mt-4 flex items-center gap-6 border-t border-[var(--card-border)] pt-4">
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <EyeIcon className="h-4 w-4" />
                  <span>{service.viewCount || 0} views</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <CursorArrowRaysIcon className="h-4 w-4" />
                  <span>{service.contactClicks || 0} contact clicks</span>
                </div>
                {service.status === "active" && (
                  <Link
                    href={`/marketplace/services/${service.id}`}
                    className="ml-auto text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    View listing →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
