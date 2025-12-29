"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile } from "@/lib/firestore/employers";
import {
  getSchoolByOrganizationId,
  getEducationProgram,
  updateEducationProgram,
  setEducationProgramPublished,
  deleteEducationProgram,
} from "@/lib/firestore";
import type {
  School,
  EducationProgram,
  ProgramLevel,
  ProgramDeliveryMethod,
} from "@/lib/types";
import { PROGRAM_CATEGORIES, PROGRAM_LEVELS } from "@/lib/types";
import {
  AcademicCapIcon,
  BookOpenIcon,
  ArrowLeftIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface ProgramFormData {
  name: string;
  slug: string;
  description: string;
  category: string;
  level: ProgramLevel;
  credential: string;
  durationValue: string;
  durationUnit: "weeks" | "months" | "years";
  deliveryMethod: ProgramDeliveryMethod;
  tuitionDomestic: string;
  tuitionInternational: string;
  applicationUrl: string;
  indigenousFocused: boolean;
  financialAidAvailable: boolean;
  contactEmail: string;
  contactPhone: string;
}

export default function EditEducationProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [program, setProgram] = useState<EducationProgram | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState<ProgramFormData>({
    name: "",
    slug: "",
    description: "",
    category: "business",
    level: "certificate",
    credential: "",
    durationValue: "",
    durationUnit: "years",
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

          // Load the program
          const programData = await getEducationProgram(id);
          if (programData) {
            // Verify the program belongs to this school
            if (schoolData && programData.schoolId === schoolData.id) {
              setProgram(programData);
              // Populate form with existing data
              setFormData({
                name: programData.name || "",
                slug: programData.slug || "",
                description: programData.description || "",
                category: programData.category || "business",
                level: programData.level || "certificate",
                credential: programData.credential || "",
                durationValue: programData.duration?.value?.toString() || "",
                durationUnit: programData.duration?.unit || "years",
                deliveryMethod: programData.deliveryMethod || "in-person",
                tuitionDomestic:
                  programData.tuition?.domestic?.toString() || "",
                tuitionInternational:
                  programData.tuition?.international?.toString() || "",
                applicationUrl: programData.sourceUrl || "",
                indigenousFocused: programData.indigenousFocused || false,
                financialAidAvailable: false,
                contactEmail: "",
                contactPhone: "",
              });
            }
          }
        }
      } catch (err) {
        console.error("Error loading program:", err);
        setError("Failed to load program");
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [user, id]);

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

  const handleSubmit = async (e: React.FormEvent, publish?: boolean) => {
    e.preventDefault();
    if (!school || !program) return;

    setError(null);
    setSaving(true);

    try {
      const updateData: Partial<EducationProgram> = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        category: formData.category,
        level: formData.level,
        credential: formData.credential,
        deliveryMethod: formData.deliveryMethod,
        indigenousFocused: formData.indigenousFocused,
      };

      // Add duration if provided
      if (formData.durationValue) {
        updateData.duration = {
          value: parseInt(formData.durationValue),
          unit: formData.durationUnit,
        };
      }

      // Add tuition if provided
      if (formData.tuitionDomestic || formData.tuitionInternational) {
        updateData.tuition = {
          domestic: formData.tuitionDomestic
            ? parseInt(formData.tuitionDomestic)
            : undefined,
          international: formData.tuitionInternational
            ? parseInt(formData.tuitionInternational)
            : undefined,
          per: "year",
        };
      }

      if (formData.applicationUrl) {
        updateData.sourceUrl = formData.applicationUrl;
      }

      await updateEducationProgram(program.id, updateData);

      // Handle publish/unpublish separately
      if (publish !== undefined) {
        await setEducationProgramPublished(program.id, publish);
      }

      router.push("/organization/education/programs");
    } catch (err) {
      console.error("Error updating program:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update program"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!program) return;

    setDeleting(true);
    try {
      await deleteEducationProgram(program.id);
      router.push("/organization/education/programs");
    } catch (err) {
      console.error("Error deleting program:", err);
      setError(err instanceof Error ? err.message : "Failed to delete program");
      setDeleting(false);
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
          You need an employer account to edit programs.
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

  if (!school || !program) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
          <AcademicCapIcon className="mx-auto h-12 w-12 text-slate-600" />
          <h2 className="mt-4 text-xl font-semibold text-white">
            Program Not Found
          </h2>
          <p className="mt-2 text-slate-400">
            This program doesn&apos;t exist or you don&apos;t have access to
            edit it.
          </p>
          <Link
            href="/organization/education/programs"
            className="mt-4 inline-block rounded-lg bg-violet-500 px-6 py-2 font-semibold text-white hover:bg-violet-600"
          >
            Back to Programs
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Edit Program</h1>
            <p className="mt-1 text-sm text-slate-400">
              Update {program.name} at {school.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                program.isPublished
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              {program.isPublished ? "Published" : "Draft"}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Delete Program?
              </h3>
            </div>
            <p className="text-slate-400 mb-6">
              Are you sure you want to delete &quot;{program.name}&quot;? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Program"}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e)} className="space-y-8">
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
                Used in the program URL.
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
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Duration Value
                </label>
                <input
                  type="number"
                  value={formData.durationValue}
                  onChange={(e) =>
                    setFormData({ ...formData, durationValue: e.target.value })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                  placeholder="e.g., 4"
                />
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Duration Unit
                </label>
                <select
                  value={formData.durationUnit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      durationUnit: e.target.value as
                        | "weeks"
                        | "months"
                        | "years",
                    })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                >
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>

              <div className="col-span-1">
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

        {/* Danger Zone */}
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-4">
            Danger Zone
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Once you delete a program, there is no going back. Please be
            certain.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-red-400 hover:bg-red-500/20"
          >
            <TrashIcon className="h-4 w-4" />
            Delete Program
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/organization/education/programs"
            className="rounded-lg border border-slate-700 px-6 py-2 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Link>
          {program.isPublished ? (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={(e) => handleSubmit(e, false)}
                className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-6 py-2 font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Unpublish"}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-2 font-semibold text-white hover:from-violet-600 hover:to-purple-600 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={(e) => handleSubmit(e, true)}
                className="rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-2 font-semibold text-white hover:from-violet-600 hover:to-purple-600 disabled:opacity-50"
              >
                {saving ? "Publishing..." : "Save & Publish"}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
