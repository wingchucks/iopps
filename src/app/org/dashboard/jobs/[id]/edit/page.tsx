"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { getPost, updatePost, deletePost } from "@/lib/firestore/posts";
import type { Post, PostStatus } from "@/lib/firestore/posts";
import { useToast } from "@/lib/toast-context";

const employmentTypes = [
  "Full-time",
  "Part-time",
  "Contract",
  "Temporary",
  "Internship",
];

export default function JobEditPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationProvince, setLocationProvince] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [requirementInput, setRequirementInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [status, setStatus] = useState<PostStatus>("draft");

  useEffect(() => {
    (async () => {
      const p = await getPost(postId);
      if (!p) {
        router.replace("/org/dashboard");
        return;
      }
      setPost(p);
      setTitle(p.title || "");
      setDescription(p.description || "");
      // Parse location into city/province
      const locParts = (p.location || "").split(",").map((s) => s.trim());
      setLocationCity(locParts[0] || "");
      setLocationProvince(locParts[1] || "");
      setEmploymentType(p.jobType || "Full-time");
      // Parse salary range
      if (p.salary) {
        const salaryMatch = p.salary.match(
          /\$?([\d,]+)\s*-\s*\$?([\d,]+)/
        );
        if (salaryMatch) {
          setSalaryMin(salaryMatch[1].replace(/,/g, ""));
          setSalaryMax(salaryMatch[2].replace(/,/g, ""));
        }
      }
      setRequirements(p.qualifications || []);
      setSkills(p.badges || []);
      setClosingDate(p.closingDate || "");
      setApplicationUrl(p.applicationUrl || "");
      setStatus(p.status || "active");
      setLoading(false);
    })();
  }, [postId, router]);

  const handleSave = async () => {
    if (!title.trim()) {
      showToast("Title is required", "error");
      return;
    }
    setSaving(true);
    try {
      const location = [locationCity, locationProvince]
        .filter(Boolean)
        .join(", ");
      const salary =
        salaryMin && salaryMax
          ? `$${Number(salaryMin).toLocaleString()} - $${Number(salaryMax).toLocaleString()}`
          : salaryMin
            ? `$${Number(salaryMin).toLocaleString()}`
            : "";
      await updatePost(postId, {
        title,
        description,
        location,
        jobType: employmentType,
        salary,
        qualifications: requirements.filter((r) => r.trim()),
        badges: skills,
        closingDate,
        applicationUrl,
        status,
      });
      showToast("Job updated successfully", "success");
    } catch (err) {
      console.error("Failed to update post:", err);
      showToast("Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    setSaving(true);
    try {
      await updatePost(postId, { status: "draft" });
      setStatus("draft");
      showToast("Job unpublished", "info");
    } catch {
      showToast("Failed to unpublish", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleClosePosition = async () => {
    setSaving(true);
    try {
      await updatePost(postId, {
        status: "closed",
        closingDate: new Date().toISOString().split("T")[0],
      });
      setStatus("closed");
      setClosingDate(new Date().toISOString().split("T")[0]);
      showToast("Position closed", "info");
    } catch {
      showToast("Failed to close position", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deletePost(postId);
      showToast("Job deleted", "success");
      router.push("/org/dashboard");
    } catch {
      showToast("Failed to delete job", "error");
    }
  };

  const addRequirement = () => {
    const trimmed = requirementInput.trim();
    if (trimmed) {
      setRequirements((prev) => [...prev, trimmed]);
      setRequirementInput("");
    }
  };

  const removeRequirement = (index: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== index));
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const inputStyle = {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "var(--text)",
  };

  return (
    <ProtectedRoute>
      <NavBar />
      <div className="min-h-screen bg-bg">
        <div className="max-w-[800px] mx-auto px-4 py-8 md:px-10">
          {/* Back link */}
          <Link
            href="/org/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-semibold no-underline mb-6 transition-opacity hover:opacity-70"
            style={{ color: "var(--teal)" }}
          >
            &larr; Back to Dashboard
          </Link>

          {loading ? (
            <div className="flex flex-col gap-4">
              <div className="h-10 w-64 rounded-xl skeleton" />
              <div className="h-[600px] rounded-2xl skeleton" />
            </div>
          ) : !post ? (
            <Card className="p-8 text-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Job posting not found.
              </p>
            </Card>
          ) : (
            <>
              <h1
                className="text-2xl font-bold mb-6"
                style={{ color: "var(--text)" }}
              >
                Edit Job Posting
              </h1>

              <Card className="p-6">
                <div className="flex flex-col gap-5">
                  {/* Title */}
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1.5"
                      style={{ color: "var(--text)" }}
                    >
                      Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Senior Software Developer"
                      className="w-full px-4 py-3 rounded-xl text-sm"
                      style={inputStyle}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1.5"
                      style={{ color: "var(--text)" }}
                    >
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the role, team, and expectations..."
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl text-sm resize-y"
                      style={inputStyle}
                    />
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        className="block text-sm font-semibold mb-1.5"
                        style={{ color: "var(--text)" }}
                      >
                        City
                      </label>
                      <input
                        type="text"
                        value={locationCity}
                        onChange={(e) => setLocationCity(e.target.value)}
                        placeholder="e.g. Toronto"
                        className="w-full px-4 py-3 rounded-xl text-sm"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-sm font-semibold mb-1.5"
                        style={{ color: "var(--text)" }}
                      >
                        Province
                      </label>
                      <input
                        type="text"
                        value={locationProvince}
                        onChange={(e) => setLocationProvince(e.target.value)}
                        placeholder="e.g. ON"
                        className="w-full px-4 py-3 rounded-xl text-sm"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Employment Type */}
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1.5"
                      style={{ color: "var(--text)" }}
                    >
                      Employment Type
                    </label>
                    <select
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm cursor-pointer"
                      style={inputStyle}
                    >
                      {employmentTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Salary Range */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        className="block text-sm font-semibold mb-1.5"
                        style={{ color: "var(--text)" }}
                      >
                        Salary Min ($)
                      </label>
                      <input
                        type="number"
                        value={salaryMin}
                        onChange={(e) => setSalaryMin(e.target.value)}
                        placeholder="e.g. 60000"
                        className="w-full px-4 py-3 rounded-xl text-sm"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-sm font-semibold mb-1.5"
                        style={{ color: "var(--text)" }}
                      >
                        Salary Max ($)
                      </label>
                      <input
                        type="number"
                        value={salaryMax}
                        onChange={(e) => setSalaryMax(e.target.value)}
                        placeholder="e.g. 90000"
                        className="w-full px-4 py-3 rounded-xl text-sm"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Requirements */}
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1.5"
                      style={{ color: "var(--text)" }}
                    >
                      Requirements
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={requirementInput}
                        onChange={(e) => setRequirementInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addRequirement();
                          }
                        }}
                        placeholder="Add a requirement..."
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm"
                        style={inputStyle}
                      />
                      <button
                        onClick={addRequirement}
                        className="px-4 py-2.5 rounded-xl border-none cursor-pointer text-sm font-semibold"
                        style={{
                          background: "rgba(13,148,136,.1)",
                          color: "var(--teal)",
                        }}
                      >
                        Add
                      </button>
                    </div>
                    {requirements.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {requirements.map((req, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg"
                            style={{
                              background: "var(--bg)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <span
                              className="text-sm flex-1"
                              style={{ color: "var(--text)" }}
                            >
                              {req}
                            </span>
                            <button
                              onClick={() => removeRequirement(i)}
                              className="border-none bg-transparent cursor-pointer text-sm font-semibold"
                              style={{ color: "#DC2626" }}
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1.5"
                      style={{ color: "var(--text)" }}
                    >
                      Skills
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSkill();
                          }
                        }}
                        placeholder="Add a skill..."
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm"
                        style={inputStyle}
                      />
                      <button
                        onClick={addSkill}
                        className="px-4 py-2.5 rounded-xl border-none cursor-pointer text-sm font-semibold"
                        style={{
                          background: "rgba(13,148,136,.1)",
                          color: "var(--teal)",
                        }}
                      >
                        Add
                      </button>
                    </div>
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{
                              background: "rgba(13,148,136,.1)",
                              color: "var(--teal)",
                            }}
                          >
                            {skill}
                            <button
                              onClick={() => removeSkill(skill)}
                              className="border-none bg-transparent cursor-pointer text-xs leading-none p-0"
                              style={{ color: "var(--teal)" }}
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Closing Date */}
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1.5"
                      style={{ color: "var(--text)" }}
                    >
                      Closing Date
                    </label>
                    <input
                      type="date"
                      value={closingDate}
                      onChange={(e) => setClosingDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm"
                      style={inputStyle}
                    />
                  </div>

                  {/* Application URL */}
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1.5"
                      style={{ color: "var(--text)" }}
                    >
                      Application URL (external)
                    </label>
                    <input
                      type="url"
                      value={applicationUrl}
                      onChange={(e) => setApplicationUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-3 rounded-xl text-sm"
                      style={inputStyle}
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label
                      className="block text-sm font-semibold mb-2"
                      style={{ color: "var(--text)" }}
                    >
                      Status
                    </label>
                    <div className="flex gap-4">
                      {(["draft", "active", "closed"] as PostStatus[]).map(
                        (s) => (
                          <label
                            key={s}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="status"
                              value={s}
                              checked={status === s}
                              onChange={() => setStatus(s)}
                              className="accent-teal-600"
                            />
                            <span
                              className="text-sm font-medium capitalize"
                              style={{ color: "var(--text)" }}
                            >
                              {s}
                            </span>
                          </label>
                        )
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                    <Button
                      primary
                      onClick={handleSave}
                      className={saving ? "opacity-50 pointer-events-none" : ""}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    {status !== "draft" && (
                      <Button
                        onClick={handleUnpublish}
                        className={saving ? "opacity-50 pointer-events-none" : ""}
                      >
                        Unpublish
                      </Button>
                    )}
                    {status !== "closed" && (
                      <Button
                        onClick={handleClosePosition}
                        className={saving ? "opacity-50 pointer-events-none" : ""}
                      >
                        Close Position
                      </Button>
                    )}
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-6 py-3 rounded-xl border-none cursor-pointer text-sm font-semibold transition-opacity hover:opacity-80"
                      style={{
                        background: "rgba(220,38,38,.1)",
                        color: "#DC2626",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </Card>

              {/* Delete confirmation dialog */}
              {showDeleteConfirm && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  style={{ background: "rgba(0,0,0,.5)" }}
                >
                  <Card className="p-6 max-w-sm w-full">
                    <h3
                      className="text-lg font-bold mb-2"
                      style={{ color: "var(--text)" }}
                    >
                      Delete Job Posting?
                    </h3>
                    <p
                      className="text-sm mb-5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      This action cannot be undone. The job posting &quot;{title}&quot; will
                      be permanently removed.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDelete}
                        className="flex-1 py-2.5 rounded-xl border-none cursor-pointer text-sm font-semibold text-white"
                        style={{ background: "#DC2626" }}
                      >
                        Yes, Delete
                      </button>
                      <Button onClick={() => setShowDeleteConfirm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
