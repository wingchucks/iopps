"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile } from "@/lib/firestore/employers";
import {
  getSchoolByOrganizationId,
  createEducationProgram,
} from "@/lib/firestore";
import type { School, EducationProgram, ProgramLevel, ProgramDeliveryMethod, ProgramStatus } from "@/lib/types";
import { PROGRAM_CATEGORIES, PROGRAM_LEVELS } from "@/lib/types";
import {
  AcademicCapIcon,
  BookOpenIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

// Simplified form data that maps to EducationProgram
interface ProgramFormData {
  name: string;
  slug: string;
  description: string;
  category: string;
  level: ProgramLevel;
  credential: string;
  durationText: string; // Simplified - we'll just use a text field
  deliveryMethod: ProgramDeliveryMethod;
  tuitionDomestic: string;
  tuitionInternational: string;
  applicationUrl: string;
  indigenousFocused: boolean;
  financialAidAvailable: boolean;
  contactEmail: string;
  contactPhone: string;
}

export default function NewEducationProgramPage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProgramFormData>({
    name: "",
    slug: "",
    description: "",
    category: "business",
    level: "certificate",
    credential: "",
    durationText: "",
    deliveryMethod: "in-person",
    tuitionDomestic: "",
    tuitionInternational: "",
    applicationUrl: "",
    indigenousFocused: false,
    financialAidAvailable: false,
    contactEmail: "",
    contactPhone: "",
  });

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const profile = await getEmployerProfile(user.uid);
        if (profile) {
          const schoolData = await getSchoolByOrganizationId(profile.id);
          setSchool(schoolData);
        }
      } catch (err) {
        console.error("Error loading school:", err);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [user]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    });
  };

  const handleSubmit = async (e: React.FormEvent, publish: boolean = false) => {
    e.preventDefault();
    if (!school) return;

    setError(null);
    setSaving(true);

    try {
      // Transform form data to EducationProgram structure
      const programData: Omit<EducationProgram, "id" | "createdAt" | "updatedAt" | "viewCount" | "inquiryCount"> = {
        schoolId: school.id,
        schoolName: school.name,
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        category: formData.category,
        level: formData.level,
        credential: formData.credential,
        deliveryMethod: formData.deliveryMethod,
        indigenousFocused: formData.indigenousFocused,
        isPublished: publish,
        status: publish ? "approved" as ProgramStatus : "pending" as ProgramStatus,
      };

      // Add optional fields if provided
      if (formData.tuitionDomestic || formData.tuitionInternational) {
        programData.tuition = {
          domestic: formData.tuitionDomestic ? parseInt(formData.tuitionDomestic) : undefined,
          international: formData.tuitionInternational ? parseInt(formData.tuitionInternational) : undefined,
          per: "year",
        };
      }

      if (formData.applicationUrl) {
        programData.sourceUrl = formData.applicationUrl;
      }

      await createEducationProgram(programData);
      router.push("/organization/education/programs");
    } catch (err) {
      console.error("Error creating program:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create program"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!user || role !== "employer") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Employer access required</h1>
        <p className="text-slate-300">
          You need an employer account to create programs.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Login
        </Link>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
          <AcademicCapIcon className="mx-auto h-12 w-12 text-slate-600" />
          <h2 className="mt-4 text-xl font-semibold text-white">
            No School Profile
          </h2>
          <p className="mt-2 text-slate-400">
            You need to create a school profile before adding programs.
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
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/organization/education/programs"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Programs
        </Link>
        <h1 className="text-2xl font-bold text-white">Add New Program</h1>
        <p className="mt-1 text-sm text-slate-400">
          Create a new academic program listing for {school.name}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-8">
        {/* Basic Information */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BookOpenIcon className="h-5 w-5 text-violet-400" />
            Basic Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Program Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                placeholder="e.g., Bachelor of Business Administration"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                URL Slug
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                placeholder="bachelor-of-business-administration"
              />
              <p className="mt-1 text-xs text-slate-500">
                Auto-generated from program name. Used in the program URL.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Description *
              </label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                placeholder="Describe what students will learn and the program outcomes..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value,
                    })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                >
                  {PROGRAM_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Level *
                </label>
                <select
                  required
                  value={formData.level}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      level: e.target.value as ProgramLevel,
                    })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                >
                  {PROGRAM_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Credential/Degree Awarded *
              </label>
              <input
                type="text"
                required
                value={formData.credential}
                onChange={(e) =>
                  setFormData({ ...formData, credential: e.target.value })
                }
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                placeholder="e.g., Bachelor of Business Administration (BBA)"
              />
            </div>
          </div>
        </div>

        {/* Program Details */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Program Details
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Duration
                </label>
                <input
                  type="text"
                  value={formData.durationText}
                  onChange={(e) =>
                    setFormData({ ...formData, durationText: e.target.value })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                  placeholder="e.g., 4 years"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Delivery Method *
                </label>
                <select
                  required
                  value={formData.deliveryMethod}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deliveryMethod: e.target.value as ProgramDeliveryMethod,
                    })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                >
                  <option value="in-person">In-Person</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Tuition (Domestic) CAD
                </label>
                <input
                  type="number"
                  value={formData.tuitionDomestic}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tuitionDomestic: e.target.value,
                    })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                  placeholder="e.g., 8500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Tuition (International) CAD
                </label>
                <input
                  type="number"
                  value={formData.tuitionInternational}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tuitionInternational: e.target.value,
                    })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                  placeholder="e.g., 18000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Application URL
              </label>
              <input
                type="url"
                value={formData.applicationUrl}
                onChange={(e) =>
                  setFormData({ ...formData, applicationUrl: e.target.value })
                }
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                placeholder="https://yourschool.ca/apply"
              />
            </div>
          </div>
        </div>

        {/* Indigenous Focus */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Indigenous Focus
          </h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.indigenousFocused}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    indigenousFocused: e.target.checked,
                  })
                }
                className="h-5 w-5 rounded border-slate-700 bg-slate-800 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-slate-300">
                This program is specifically designed for or focused on
                Indigenous students
              </span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.financialAidAvailable}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    financialAidAvailable: e.target.checked,
                  })
                }
                className="h-5 w-5 rounded border-slate-700 bg-slate-800 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-slate-300">
                Financial aid or scholarships available for Indigenous students
              </span>
            </label>
          </div>
        </div>

        {/* Contact Information */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Contact Information
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) =>
                  setFormData({ ...formData, contactEmail: e.target.value })
                }
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                placeholder="admissions@school.ca"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) =>
                  setFormData({ ...formData, contactPhone: e.target.value })
                }
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                placeholder="(306) 555-0100"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/organization/education/programs"
            className="rounded-lg border border-slate-700 px-6 py-2 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save as Draft"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={(e) => handleSubmit(e, true)}
            className="rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-2 font-semibold text-white hover:from-violet-600 hover:to-purple-600 disabled:opacity-50"
          >
            {saving ? "Publishing..." : "Save & Publish"}
          </button>
        </div>
      </form>
    </div>
  );
}
