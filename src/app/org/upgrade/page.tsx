"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const ORG_TYPES = [
  { value: "employer", label: "Employer / Business", desc: "Post jobs and find Indigenous talent" },
  { value: "school", label: "School / Training", desc: "List programs, courses, and scholarships" },
  { value: "business", label: "Indigenous Business", desc: "Showcase your products and services" },
  { value: "nonprofit", label: "Non-Profit / Organization", desc: "Share events, scholarships, and opportunities" },
  { value: "legal", label: "Legal Services", desc: "Law firms and legal service providers" },
  { value: "professional", label: "Professional Services", desc: "Consulting, accounting, and other professional services" },
];

export default function OrgUpgradePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "",
    website: "",
    location: "",
    description: "",
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="text-center">
          <p className="text-text-sec mb-4">You need to be signed in to upgrade your account.</p>
          <a href="/login" className="text-teal font-semibold underline">Sign in</a>
        </div>
      </div>
    );
  }

  async function handleSubmit() {
    if (!form.name || !form.type) {
      setError("Organization name and type are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = await user!.getIdToken();
      const res = await fetch("/api/employer/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upgrade failed");
      // Force token refresh so new role takes effect
      await user!.getIdToken(true);
      router.push("/org/onboarding");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal/10 text-teal text-2xl mb-4">🏢</div>
          <h1 className="text-2xl font-extrabold text-text">Set Up Your Organization</h1>
          <p className="text-text-sec mt-1">Convert your community account to an organization page</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step >= s ? "bg-teal text-white" : "bg-card border border-border text-text-muted"
              }`}>
                {s}
              </div>
              {s < 2 && <div className={`w-12 h-0.5 ${step > s ? "bg-teal" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-bold text-text text-lg">Organization Details</h2>

              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. MLT Aikins LLP"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-bg text-text placeholder:text-text-muted focus:outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">
                  Organization Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {ORG_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm({ ...form, type: t.value })}
                      className={`text-left px-4 py-3 rounded-xl border transition-all ${
                        form.type === t.value
                          ? "border-teal bg-teal/5"
                          : "border-border bg-bg hover:border-teal/40"
                      }`}
                    >
                      <p className="font-semibold text-text text-sm">{t.label}</p>
                      <p className="text-xs text-text-muted">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  if (!form.name || !form.type) { setError("Please fill in name and type."); return; }
                  setError("");
                  setStep(2);
                }}
                className="w-full py-3 rounded-xl bg-teal text-white font-bold hover:bg-teal/90 transition-colors mt-2"
              >
                Continue →
              </button>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-bold text-text text-lg">Additional Info <span className="text-text-muted font-normal text-sm">(optional)</span></h2>

              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Website</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://www.yourorg.com"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-bg text-text placeholder:text-text-muted focus:outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Winnipeg, Manitoba"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-bg text-text placeholder:text-text-muted focus:outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Tell the community about your organization..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-bg text-text placeholder:text-text-muted focus:outline-none focus:border-teal resize-none"
                />
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl border border-border text-text font-semibold hover:bg-card/60 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-2 flex-grow py-3 rounded-xl bg-teal text-white font-bold hover:bg-teal/90 transition-colors disabled:opacity-50"
                >
                  {loading ? "Setting up…" : "Create Organization Page →"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-text-muted mt-4">
          Already have an org account?{" "}
          <a href="/org/dashboard" className="text-teal underline">Go to Dashboard</a>
        </p>
      </div>
    </div>
  );
}
