"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  getMemberJobAlerts,
  deleteJobAlert,
  updateJobAlert,
  createJobAlert,
} from "@/lib/firestore";
import type { JobAlert, JobAlertFrequency } from "@/lib/types";
import { Bell, Plus } from "lucide-react";
import toast from "react-hot-toast";

export default function ProfileAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [alertName, setAlertName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [indigenousOnly, setIndigenousOnly] = useState(false);
  const [frequency, setFrequency] = useState<JobAlertFrequency>("daily");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await getMemberJobAlerts(user.uid);
        setAlerts(data);
      } catch (error) {
        console.error("Error loading alerts:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this alert?")) return;
    try {
      await deleteJobAlert(id);
      setAlerts(alerts.filter((a) => a.id !== id));
      toast.success("Alert deleted.");
    } catch {
      toast.error("Failed to delete alert.");
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await updateJobAlert(id, { active });
      setAlerts(alerts.map((a) => (a.id === id ? { ...a, active } : a)));
    } catch {
      toast.error("Failed to update alert.");
    }
  };

  const resetForm = () => {
    setAlertName("");
    setKeyword("");
    setLocation("");
    setEmploymentType("");
    setRemoteOnly(false);
    setIndigenousOnly(false);
    setFrequency("daily");
    setShowCreate(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (
      !keyword &&
      !location &&
      !employmentType &&
      !remoteOnly &&
      !indigenousOnly
    ) {
      toast.error("Set at least one filter for your alert.");
      return;
    }

    try {
      setProcessing(true);
      const alertData: Omit<JobAlert, "id" | "createdAt" | "updatedAt"> = {
        memberId: user.uid,
        frequency,
        active: true,
        ...(alertName && { alertName }),
        ...(keyword && { keyword }),
        ...(location && { location }),
        ...(employmentType && { employmentType }),
        ...(remoteOnly && { remoteOnly }),
        ...(indigenousOnly && { indigenousOnly }),
      };

      const newId = await createJobAlert(alertData);
      const newAlert: JobAlert = {
        id: newId,
        ...alertData,
        createdAt: null,
        updatedAt: null,
      };
      setAlerts([newAlert, ...alerts]);
      resetForm();
      toast.success("Alert created!");
    } catch {
      toast.error("Failed to create alert.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-[var(--text-muted)]">
        Loading alerts...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          Get notified when new jobs match your criteria.
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          <Plus className="h-4 w-4" />
          New Alert
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <h4 className="font-semibold text-[var(--text-primary)] mb-4">
            Create Job Alert
          </h4>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text"
              value={alertName}
              onChange={(e) => setAlertName(e.target.value)}
              placeholder="Alert name (optional)"
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Keywords"
                className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
              />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location"
                className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Temporary">Temporary</option>
                <option value="Internship">Internship</option>
              </select>
              <select
                value={frequency}
                onChange={(e) =>
                  setFrequency(e.target.value as JobAlertFrequency)
                }
                className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="instant">Instant</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={remoteOnly}
                  onChange={(e) => setRemoteOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--card-border)] text-[var(--accent)]"
                />
                Remote only
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={indigenousOnly}
                  onChange={(e) => setIndigenousOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--card-border)] text-[var(--accent)]"
                />
                Indigenous preference
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={processing}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {processing ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--border-lt)]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alerts list */}
      {alerts.length === 0 && !showCreate ? (
        <div className="text-center py-12">
          <Bell className="h-10 w-10 mx-auto text-[var(--text-muted)] mb-2" />
          <p className="text-[var(--text-muted)]">No job alerts yet.</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Create alerts to get notified about matching jobs.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-[var(--text-primary)] truncate">
                    {alert.alertName ||
                      (alert.keyword
                        ? `${alert.keyword} Jobs`
                        : "Job Alert")}
                  </h4>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      alert.active
                        ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "bg-[var(--border-lt)] text-[var(--text-muted)]"
                    }`}
                  >
                    {alert.active ? "Active" : "Paused"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                  {alert.keyword && <span>Keywords: {alert.keyword}</span>}
                  {alert.location && <span>Location: {alert.location}</span>}
                  <span className="capitalize">
                    Frequency: {alert.frequency}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  onClick={() => handleToggle(alert.id, !alert.active)}
                  className={`text-xs font-medium ${
                    alert.active
                      ? "text-amber-400 hover:text-amber-300"
                      : "text-[var(--accent)] hover:underline"
                  }`}
                >
                  {alert.active ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={() => handleDelete(alert.id)}
                  className="text-xs font-medium text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
