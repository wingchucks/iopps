"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import OrgRoute from "@/components/OrgRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { getMemberProfile } from "@/lib/firestore/members";
import {
  getOrganization,
  updateOrganization,
} from "@/lib/firestore/organizations";
import type { Organization } from "@/lib/firestore/organizations";
import { auth } from "@/lib/firebase";

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Education",
  "Finance",
  "Manufacturing",
  "Retail",
  "Construction",
  "Transportation",
  "Agriculture",
  "Energy",
  "Media & Entertainment",
  "Hospitality",
  "Real Estate",
  "Non-Profit",
  "Government",
  "Other",
];

const SIZES = ["1-10", "11-50", "51-200", "200+"];

interface ProfileForm {
  name: string;
  logo: string;
  banner: string;
  description: string;
  industry: string;
  size: string;
  city: string;
  province: string;
  website: string;
  phone: string;
  contactEmail: string;
  address: string;
  facebook: string;
  linkedin: string;
  instagram: string;
  twitter: string;
}

function completeness(form: ProfileForm): number {
  const fields = [
    form.name,
    form.logo,
    form.banner,
    form.description,
    form.industry,
    form.size,
    form.city || form.province,
    form.website,
    form.phone,
  ];
  const filled = fields.filter((f) => f && f.trim() !== "").length;
  return Math.round((filled / fields.length) * 100);
}

function ProfilePreview({ form }: { form: ProfileForm }) {
  return (
    <Card className="p-6">
      {form.banner && (
        <div className="relative w-full h-32 rounded-xl overflow-hidden mb-4" style={{ border: "1px solid var(--border)" }}>
          <Image
            src={form.banner}
            alt="Banner"
            fill
            className="object-cover"
          />
        </div>
      )}
      <div className="flex items-start gap-4">
        {form.logo ? (
          <Image
            src={form.logo}
            alt={form.name}
            width={64}
            height={64}
            className="w-16 h-16 rounded-xl object-cover"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl"
            style={{ background: "var(--navy)" }}
          >
            {form.name?.charAt(0) || "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>
            {form.name || "Organization Name"}
          </h3>
          {form.industry && (
            <span
              className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1"
              style={{
                background: "rgba(13,148,136,.1)",
                color: "var(--teal)",
              }}
            >
              {form.industry}
            </span>
          )}
          {(form.city || form.province) && (
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {[form.city, form.province].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>
      {form.description && (
        <p
          className="text-sm mt-4 leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          {form.description}
        </p>
      )}
      <div
        className="grid grid-cols-2 gap-3 mt-4 text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        {form.size && (
          <div>
            <span className="font-semibold" style={{ color: "var(--text)" }}>
              Size:
            </span>{" "}
            {form.size} employees
          </div>
        )}
        {form.website && (
          <div>
            <span className="font-semibold" style={{ color: "var(--text)" }}>
              Website:
            </span>{" "}
            {form.website}
          </div>
        )}
        {form.phone && (
          <div>
            <span className="font-semibold" style={{ color: "var(--text)" }}>
              Phone:
            </span>{" "}
            {form.phone}
          </div>
        )}
        {form.contactEmail && (
          <div>
            <span className="font-semibold" style={{ color: "var(--text)" }}>
              Email:
            </span>{" "}
            {form.contactEmail}
          </div>
        )}
      </div>
      {(form.facebook || form.linkedin || form.instagram || form.twitter) && (
        <div className="flex gap-3 mt-4">
          {form.facebook && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(13,148,136,.08)", color: "var(--teal)" }}>
              Facebook
            </span>
          )}
          {form.linkedin && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(13,148,136,.08)", color: "var(--teal)" }}>
              LinkedIn
            </span>
          )}
          {form.instagram && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(13,148,136,.08)", color: "var(--teal)" }}>
              Instagram
            </span>
          )}
          {form.twitter && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(13,148,136,.08)", color: "var(--teal)" }}>
              Twitter
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

export default function OrgProfileEditPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [preview, setPreview] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    logo: "",
    banner: "",
    description: "",
    industry: "",
    size: "",
    city: "",
    province: "",
    website: "",
    phone: "",
    contactEmail: "",
    address: "",
    facebook: "",
    linkedin: "",
    instagram: "",
    twitter: "",
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const member = await getMemberProfile(user.uid);
      if (!member?.orgId) return;
      setOrgId(member.orgId);
      const org = await getOrganization(member.orgId);
      if (org) {
        const loc =
          org.location && typeof org.location === "object"
            ? org.location
            : { city: "", province: "" };
        setForm({
          name: org.name || "",
          logo: org.logo || "",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          banner: org.bannerUrl || (org as any).banner || "",
          description: org.description || "",
          industry: org.industry || "",
          size: org.size || "",
          city: loc.city || "",
          province: loc.province || "",
          website: org.website || "",
          phone: org.phone || "",
          contactEmail: org.contactEmail || "",
          address: org.address || "",
          facebook: org.socialLinks?.facebook || "",
          linkedin: org.socialLinks?.linkedin || "",
          instagram: org.socialLinks?.instagram || "",
          twitter: org.socialLinks?.twitter || "",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const pct = useMemo(() => completeness(form), [form]);

  const set = (key: keyof ProfileForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const uploadOrgImage = async (file: File, type: "logo" | "banner") => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated");
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    // Step 1: Get a signed upload URL
    const res1 = await fetch("/api/org/upload", {
      method: "POST",
      headers,
      body: JSON.stringify({ type, contentType: file.type }),
    });
    if (!res1.ok) {
      const msg = await res1.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(msg.error || "Upload failed");
    }
    const { signedUrl } = await res1.json();

    // Step 2: Upload directly to Cloud Storage (bypasses Vercel body limit)
    const uploadRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!uploadRes.ok) throw new Error("Storage upload failed");

    // Step 3: Make public + update org document
    const res2 = await fetch("/api/org/upload", {
      method: "PUT",
      headers,
      body: JSON.stringify({ type }),
    });
    if (!res2.ok) throw new Error("Failed to finalize upload");
    const { url } = await res2.json();
    return url as string;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    setUploading(true);
    try {
      const url = await uploadOrgImage(file, "logo");
      set("logo", url);
      showToast("Logo uploaded", "success");
    } catch (err) {
      console.error("Logo upload failed:", err);
      showToast("Failed to upload logo", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    setUploadingBanner(true);
    try {
      const url = await uploadOrgImage(file, "banner");
      set("banner", url);
      showToast("Banner uploaded", "success");
    } catch (err) {
      console.error("Banner upload failed:", err);
      showToast("Failed to upload banner", "error");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      await updateOrganization(orgId, {
        name: form.name,
        logo: form.logo,
        bannerUrl: form.banner,
        description: form.description,
        industry: form.industry,
        size: form.size,
        location: { city: form.city, province: form.province },
        website: form.website,
        phone: form.phone,
        contactEmail: form.contactEmail,
        address: form.address,
        socialLinks: {
          facebook: form.facebook,
          linkedin: form.linkedin,
          instagram: form.instagram,
          twitter: form.twitter,
        },
      });
      showToast("Profile saved successfully", "success");
    } catch (err) {
      console.error("Save failed:", err);
      showToast("Failed to save profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "var(--text)",
  };

  return (
    <OrgRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <div className="max-w-[900px] mx-auto px-4 py-8 md:px-10">
          {loading ? (
            <div className="flex flex-col gap-4">
              <div className="h-6 w-40 rounded skeleton" />
              <div className="h-10 w-72 rounded-xl skeleton" />
              <div className="h-8 w-full rounded-xl skeleton" />
              <div className="h-64 rounded-2xl skeleton" />
            </div>
          ) : (
            <>
              {/* Back link */}
              <Link
                href="/org/dashboard"
                className="text-sm font-semibold mb-6 inline-block"
                style={{ color: "var(--teal)" }}
              >
                &larr; Back to Dashboard
              </Link>

              <h1
                className="text-2xl font-bold mb-6"
                style={{ color: "var(--text)" }}
              >
                Edit Organization Profile
              </h1>

              {/* Completeness meter */}
              <Card className="p-5 mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "var(--text)" }}
                  >
                    Profile Completeness
                  </span>
                  <span
                    className="text-sm font-bold"
                    style={{ color: "var(--teal)" }}
                  >
                    {pct}%
                  </span>
                </div>
                <div
                  className="w-full h-2.5 rounded-full overflow-hidden"
                  style={{ background: "var(--border)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background:
                        pct === 100
                          ? "#10B981"
                          : "var(--teal)",
                    }}
                  />
                </div>
                {pct < 100 && (
                  <p
                    className="text-xs mt-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Complete your profile to help members learn about your
                    organization.
                  </p>
                )}
              </Card>

              {/* Preview toggle */}
              <div className="flex justify-end mb-4">
                <Button small onClick={() => setPreview((p) => !p)}>
                  {preview ? "Edit Mode" : "Preview"}
                </Button>
              </div>

              {preview ? (
                <ProfilePreview form={form} />
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Identity section */}
                  <Card className="p-6">
                    <h2
                      className="text-lg font-bold mb-4"
                      style={{ color: "var(--text)" }}
                    >
                      Identity
                    </h2>
                    <div className="flex flex-col gap-4">
                      {/* Logo */}
                      <div>
                        <label
                          className="block text-sm font-semibold mb-2"
                          style={{ color: "var(--text)" }}
                        >
                          Logo
                        </label>
                        <div className="flex items-center gap-4">
                          {form.logo ? (
                            <Image
                              src={form.logo}
                              alt="Logo"
                              width={64}
                              height={64}
                              className="w-16 h-16 rounded-xl object-cover"
                            />
                          ) : (
                            <div
                              className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl"
                              style={{ background: "var(--navy)" }}
                            >
                              {form.name?.charAt(0) || "?"}
                            </div>
                          )}
                          <label
                            className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                            style={{
                              background: "rgba(13,148,136,.1)",
                              color: "var(--teal)",
                            }}
                          >
                            {uploading ? "Uploading..." : "Upload Logo"}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                              disabled={uploading}
                            />
                          </label>
                        </div>
                      </div>
                      {/* Banner */}
                      <div>
                        <label
                          className="block text-sm font-semibold mb-2"
                          style={{ color: "var(--text)" }}
                        >
                          Banner Image
                        </label>
                        <div className="flex flex-col gap-3">
                          {form.banner ? (
                            <div className="relative w-full h-32 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                              <Image
                                src={form.banner}
                                alt="Banner"
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div
                              className="w-full h-32 rounded-xl flex items-center justify-center"
                              style={{ background: "var(--bg)", border: "2px dashed var(--border)" }}
                            >
                              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                                No banner image — recommended 1200×300
                              </span>
                            </div>
                          )}
                          <label
                            className="inline-flex px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80 w-fit"
                            style={{
                              background: "rgba(13,148,136,.1)",
                              color: "var(--teal)",
                            }}
                          >
                            {uploadingBanner ? "Uploading..." : "Upload Banner"}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleBannerUpload}
                              className="hidden"
                              disabled={uploadingBanner}
                            />
                          </label>
                        </div>
                      </div>
                      {/* Name */}
                      <div>
                        <label
                          className="block text-sm font-semibold mb-1"
                          style={{ color: "var(--text)" }}
                        >
                          Organization Name
                        </label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => set("name", e.target.value)}
                          placeholder="Your organization name"
                          className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                          style={{
                            ...inputStyle,
                            // @ts-expect-error CSS custom property
                            "--tw-ring-color": "var(--teal)",
                          }}
                        />
                      </div>
                      {/* Description */}
                      <div>
                        <label
                          className="block text-sm font-semibold mb-1"
                          style={{ color: "var(--text)" }}
                        >
                          Description
                        </label>
                        <textarea
                          value={form.description}
                          onChange={(e) => set("description", e.target.value)}
                          placeholder="Tell members about your organization..."
                          rows={4}
                          className="w-full px-3 py-2.5 rounded-xl text-sm resize-y focus:outline-none focus:ring-2"
                          style={{
                            ...inputStyle,
                            // @ts-expect-error CSS custom property
                            "--tw-ring-color": "var(--teal)",
                          }}
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Details section */}
                  <Card className="p-6">
                    <h2
                      className="text-lg font-bold mb-4"
                      style={{ color: "var(--text)" }}
                    >
                      Details
                    </h2>
                    <div className="flex flex-col gap-4">
                      {/* Industry */}
                      <div>
                        <label
                          className="block text-sm font-semibold mb-1"
                          style={{ color: "var(--text)" }}
                        >
                          Industry
                        </label>
                        <select
                          value={form.industry}
                          onChange={(e) => set("industry", e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                          style={{
                            ...inputStyle,
                            // @ts-expect-error CSS custom property
                            "--tw-ring-color": "var(--teal)",
                          }}
                        >
                          <option value="">Select industry</option>
                          {INDUSTRIES.map((ind) => (
                            <option key={ind} value={ind}>
                              {ind}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Size */}
                      <div>
                        <label
                          className="block text-sm font-semibold mb-1"
                          style={{ color: "var(--text)" }}
                        >
                          Organization Size
                        </label>
                        <div className="flex gap-3 flex-wrap">
                          {SIZES.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => set("size", s)}
                              className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all border-none"
                              style={{
                                background:
                                  form.size === s
                                    ? "var(--teal)"
                                    : "var(--bg)",
                                color:
                                  form.size === s
                                    ? "#fff"
                                    : "var(--text)",
                                border:
                                  form.size === s
                                    ? "none"
                                    : "1px solid var(--border)",
                              }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Location */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label
                            className="block text-sm font-semibold mb-1"
                            style={{ color: "var(--text)" }}
                          >
                            City
                          </label>
                          <input
                            type="text"
                            value={form.city}
                            onChange={(e) => set("city", e.target.value)}
                            placeholder="e.g. Toronto"
                            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                            style={{
                              ...inputStyle,
                              // @ts-expect-error CSS custom property
                              "--tw-ring-color": "var(--teal)",
                            }}
                          />
                        </div>
                        <div>
                          <label
                            className="block text-sm font-semibold mb-1"
                            style={{ color: "var(--text)" }}
                          >
                            Province
                          </label>
                          <input
                            type="text"
                            value={form.province}
                            onChange={(e) => set("province", e.target.value)}
                            placeholder="e.g. Ontario"
                            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                            style={{
                              ...inputStyle,
                              // @ts-expect-error CSS custom property
                              "--tw-ring-color": "var(--teal)",
                            }}
                          />
                        </div>
                      </div>
                      {/* Website */}
                      <div>
                        <label
                          className="block text-sm font-semibold mb-1"
                          style={{ color: "var(--text)" }}
                        >
                          Website
                        </label>
                        <input
                          type="url"
                          value={form.website}
                          onChange={(e) => set("website", e.target.value)}
                          placeholder="https://yourorg.com"
                          className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                          style={{
                            ...inputStyle,
                            // @ts-expect-error CSS custom property
                            "--tw-ring-color": "var(--teal)",
                          }}
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Contact section */}
                  <Card className="p-6">
                    <h2
                      className="text-lg font-bold mb-4"
                      style={{ color: "var(--text)" }}
                    >
                      Contact
                    </h2>
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label
                            className="block text-sm font-semibold mb-1"
                            style={{ color: "var(--text)" }}
                          >
                            Phone
                          </label>
                          <input
                            type="tel"
                            value={form.phone}
                            onChange={(e) => set("phone", e.target.value)}
                            placeholder="(555) 123-4567"
                            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                            style={{
                              ...inputStyle,
                              // @ts-expect-error CSS custom property
                              "--tw-ring-color": "var(--teal)",
                            }}
                          />
                        </div>
                        <div>
                          <label
                            className="block text-sm font-semibold mb-1"
                            style={{ color: "var(--text)" }}
                          >
                            Email
                          </label>
                          <input
                            type="email"
                            value={form.contactEmail}
                            onChange={(e) =>
                              set("contactEmail", e.target.value)
                            }
                            placeholder="contact@yourorg.com"
                            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                            style={{
                              ...inputStyle,
                              // @ts-expect-error CSS custom property
                              "--tw-ring-color": "var(--teal)",
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          className="block text-sm font-semibold mb-1"
                          style={{ color: "var(--text)" }}
                        >
                          Address
                        </label>
                        <input
                          type="text"
                          value={form.address}
                          onChange={(e) => set("address", e.target.value)}
                          placeholder="123 Main St, Suite 100"
                          className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                          style={{
                            ...inputStyle,
                            // @ts-expect-error CSS custom property
                            "--tw-ring-color": "var(--teal)",
                          }}
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Social section */}
                  <Card className="p-6">
                    <h2
                      className="text-lg font-bold mb-4"
                      style={{ color: "var(--text)" }}
                    >
                      Social Links
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(
                        [
                          ["facebook", "Facebook URL"],
                          ["linkedin", "LinkedIn URL"],
                          ["instagram", "Instagram URL"],
                          ["twitter", "Twitter / X URL"],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key}>
                          <label
                            className="block text-sm font-semibold mb-1"
                            style={{ color: "var(--text)" }}
                          >
                            {label}
                          </label>
                          <input
                            type="url"
                            value={form[key]}
                            onChange={(e) => set(key, e.target.value)}
                            placeholder={`https://${key}.com/yourorg`}
                            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                            style={{
                              ...inputStyle,
                              // @ts-expect-error CSS custom property
                              "--tw-ring-color": "var(--teal)",
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Save button */}
                  <div className="flex justify-end pb-24">
                    <Button
                      primary
                      onClick={handleSave}
                      className={saving ? "opacity-50 pointer-events-none" : ""}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
    </OrgRoute>
  );
}
