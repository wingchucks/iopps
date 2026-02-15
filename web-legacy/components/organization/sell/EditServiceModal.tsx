"use client";

import { FormEvent, useState, useEffect } from "react";
import { getService, updateService } from "@/lib/firestore/services";
import { SERVICE_CATEGORIES, NORTH_AMERICAN_REGIONS } from "@/lib/types";
import type { ServiceCategory, NorthAmericanRegion, ServiceStatus } from "@/lib/types";
import {
  BriefcaseIcon,
  MapPinIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface EditServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  serviceId: string;
}

export default function EditServiceModal({
  isOpen,
  onClose,
  onSaved,
  serviceId,
}: EditServiceModalProps) {
  // Form state
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ServiceCategory | "">("");
  const [location, setLocation] = useState("");
  const [region, setRegion] = useState<NorthAmericanRegion | "">("");
  const [servesRemote, setServesRemote] = useState(false);
  const [serviceAreas, setServiceAreas] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [freeConsultation, setFreeConsultation] = useState(false);
  const [status, setStatus] = useState<ServiceStatus>("pending");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load service data when modal opens
  useEffect(() => {
    if (isOpen && serviceId) {
      loadService();
    }
  }, [isOpen, serviceId]);

  const loadService = async () => {
    setLoading(true);
    setError(null);
    try {
      const service = await getService(serviceId);
      if (service) {
        setTitle(service.title || "");
        setTagline(service.tagline || "");
        setDescription(service.description || "");
        setCategory((service.category as ServiceCategory) || "");
        setLocation(service.location || "");
        setRegion((service.region as NorthAmericanRegion) || "");
        setServesRemote(service.servesRemote ?? false);
        setServiceAreas(service.serviceAreas?.join(", ") || "");
        setEmail(service.email || "");
        setPhone(service.phone || "");
        setWebsite(service.website || "");
        setBookingUrl(service.bookingUrl || "");
        setPriceRange(service.priceRange || "");
        setFreeConsultation(service.freeConsultation ?? false);
        setStatus(service.status || "pending");
      }
    } catch (err) {
      console.error("Error loading service:", err);
      setError("Failed to load service data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Service title is required");
      return;
    }
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    if (!category) {
      setError("Category is required");
      return;
    }
    if (!region) {
      setError("Region is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const serviceAreasArray = serviceAreas
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await updateService(serviceId, {
        title: title.trim(),
        tagline: tagline.trim() || undefined,
        description: description.trim(),
        category: category as ServiceCategory,
        location: location.trim() || undefined,
        region: region as NorthAmericanRegion,
        servesRemote,
        serviceAreas: serviceAreasArray.length > 0 ? serviceAreasArray : undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        bookingUrl: bookingUrl.trim() || undefined,
        priceRange: priceRange.trim() || undefined,
        freeConsultation,
        status,
      });

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not update service.");
    } finally {
      setSaving(false);
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-service-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-[var(--card-border)] bg-surface shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--card-border)] bg-surface px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <BriefcaseIcon className="h-5 w-5 text-white" />
            </div>
            <h2 id="edit-service-title" className="text-xl font-semibold text-foreground">
              Edit Service
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-surface hover:text-foreground disabled:opacity-50"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            {/* Service Information */}
            <section className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
              <div className="flex items-center gap-2 mb-3">
                <BriefcaseIcon className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Service Information</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Service Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Indigenous Business Consulting"
                    className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="A brief catchy description"
                    className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Description *
                  </label>
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Describe your services..."
                    className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Category *
                  </label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                    className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Select a category</option>
                    {SERVICE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Location & Availability */}
            <section className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPinIcon className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Location & Availability</h3>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      City/Town
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Toronto"
                      className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      Region *
                    </label>
                    <select
                      required
                      value={region}
                      onChange={(e) => setRegion(e.target.value as NorthAmericanRegion)}
                      className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">Select a region</option>
                      {NORTH_AMERICAN_REGIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Service Areas
                  </label>
                  <input
                    type="text"
                    value={serviceAreas}
                    onChange={(e) => setServiceAreas(e.target.value)}
                    placeholder="Comma-separated: Toronto, Vancouver, Calgary"
                    className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={servesRemote}
                    onChange={(e) => setServesRemote(e.target.checked)}
                    className="h-5 w-5 rounded border-[var(--card-border)] bg-surface text-indigo-500 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-2">
                    <GlobeAltIcon className="h-4 w-4 text-[var(--text-muted)]" />
                    <span className="text-sm text-[var(--text-secondary)]">
                      Available for remote/virtual services
                    </span>
                  </div>
                </label>
              </div>
            </section>

            {/* Contact Information */}
            <section className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
              <div className="flex items-center gap-2 mb-3">
                <EnvelopeIcon className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Contact Information</h3>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@example.com"
                      className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      Website
                    </label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                      className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      Booking URL
                    </label>
                    <input
                      type="url"
                      value={bookingUrl}
                      onChange={(e) => setBookingUrl(e.target.value)}
                      placeholder="Link to your scheduling"
                      className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Pricing & Status */}
            <section className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircleIcon className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Pricing & Status</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Price Range
                  </label>
                  <input
                    type="text"
                    value={priceRange}
                    onChange={(e) => setPriceRange(e.target.value)}
                    placeholder="e.g., $100-$200/hr"
                    className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ServiceStatus)}
                    className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="pending">Pending Review</option>
                    <option value="active">Active</option>
                  </select>
                  <p className="mt-1 text-xs text-foreground0">
                    Note: Active services are visible in the marketplace
                  </p>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={freeConsultation}
                    onChange={(e) => setFreeConsultation(e.target.checked)}
                    className="h-5 w-5 rounded border-[var(--card-border)] bg-surface text-indigo-500 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-accent" />
                    <span className="text-sm text-[var(--text-secondary)]">
                      Offer free initial consultation
                    </span>
                  </div>
                </label>
              </div>
            </section>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--card-border)]">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-surface disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
