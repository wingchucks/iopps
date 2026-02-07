"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { JobAlert, JobAlertFrequency } from "@/lib/types";
import toast from "react-hot-toast";

export default function MemberAlertsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<JobAlert | null>(null);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [alertName, setAlertName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [indigenousOnly, setIndigenousOnly] = useState(false);
  const [minSalary, setMinSalary] = useState<number | "">("");
  const [maxSalary, setMaxSalary] = useState<number | "">("");
  const [frequency, setFrequency] = useState<JobAlertFrequency>("daily");

  // Check if user is a community member - anyone who is NOT employer/admin/moderator
  // This aligns with the SiteHeader logic for showing "My Dashboard" link
  const isCommunityMember = role !== null && role !== "employer" && role !== "admin" && role !== "moderator";

  useEffect(() => {
    if (authLoading) return;

    if (!user || !isCommunityMember) {
      router.push("/");
      return;
    }

    loadAlerts();
  }, [user, isCommunityMember, authLoading, router]);

  async function loadAlerts() {
    if (!user) return;

    try {
      setLoading(true);

      const alertsRef = collection(db!, "jobAlerts");
      const alertsQuery = query(
        alertsRef,
        where("memberId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const alertsSnap = await getDocs(alertsQuery);
      const alertsList: JobAlert[] = alertsSnap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<JobAlert, "id">),
      }));

      setAlerts(alertsList);
    } catch (error) {
      console.error("Error loading alerts:", error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setAlertName("");
    setKeyword("");
    setLocation("");
    setEmploymentType("");
    setRemoteOnly(false);
    setIndigenousOnly(false);
    setMinSalary("");
    setMaxSalary("");
    setFrequency("daily");
    setEditingAlert(null);
    setShowCreateForm(false);
  }

  function startEdit(alert: JobAlert) {
    setEditingAlert(alert);
    setAlertName(alert.alertName || "");
    setKeyword(alert.keyword || "");
    setLocation(alert.location || "");
    setEmploymentType(alert.employmentType || "");
    setRemoteOnly(alert.remoteOnly || false);
    setIndigenousOnly(alert.indigenousOnly || false);
    setMinSalary(alert.minSalary || "");
    setMaxSalary(alert.maxSalary || "");
    setFrequency(alert.frequency);
    setShowCreateForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    // Validate that at least one filter is set
    if (
      !keyword &&
      !location &&
      !employmentType &&
      !remoteOnly &&
      !indigenousOnly &&
      !minSalary &&
      !maxSalary
    ) {
      toast.error("Please set at least one filter for your job alert.");
      return;
    }

    try {
      setProcessing(true);

      const alertData = {
        memberId: user.uid,
        alertName: alertName || undefined,
        keyword: keyword || undefined,
        location: location || undefined,
        employmentType: employmentType || undefined,
        remoteOnly: remoteOnly || undefined,
        indigenousOnly: indigenousOnly || undefined,
        minSalary: minSalary || undefined,
        maxSalary: maxSalary || undefined,
        frequency,
        active: true,
        updatedAt: serverTimestamp(),
      };

      if (editingAlert) {
        // Update existing alert
        const alertRef = doc(db!, "jobAlerts", editingAlert.id);
        await updateDoc(alertRef, alertData);

        // Update local state (exclude updatedAt since it's a FieldValue)
        const { updatedAt, ...localAlertData } = alertData;
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === editingAlert.id
              ? { ...a, ...localAlertData, id: editingAlert.id, updatedAt: null }
              : a
          )
        );
      } else {
        // Create new alert
        const alertsRef = collection(db!, "jobAlerts");
        const docRef = await addDoc(alertsRef, {
          ...alertData,
          createdAt: serverTimestamp(),
        });

        // Add to local state
        setAlerts((prev) => [
          {
            id: docRef.id,
            ...alertData,
            createdAt: null,
          } as JobAlert,
          ...prev,
        ]);
      }

      resetForm();
    } catch (error) {
      console.error("Error saving alert:", error);
      toast.error("Failed to save job alert. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  async function toggleAlertStatus(alertId: string, currentStatus: boolean) {
    try {
      const alertRef = doc(db!, "jobAlerts", alertId);
      await updateDoc(alertRef, {
        active: !currentStatus,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, active: !currentStatus } : a))
      );
    } catch (error) {
      console.error("Error toggling alert status:", error);
      toast.error("Failed to update alert status. Please try again.");
    }
  }

  async function deleteAlert(alertId: string, alertName: string) {
    const confirmed = confirm(
      `Are you sure you want to delete the alert "${alertName || "Untitled Alert"}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const alertRef = doc(db!, "jobAlerts", alertId);
      await deleteDoc(alertRef);

      // Update local state
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (error) {
      console.error("Error deleting alert:", error);
      toast.error("Failed to delete alert. Please try again.");
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-[var(--text-muted)]">Loading job alerts...</p>
        </div>
      </div>
    );
  }

  if (!user || !isCommunityMember) {
    return null;
  }

  const activeAlerts = alerts.filter((a) => a.active);
  const inactiveAlerts = alerts.filter((a) => !a.active);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-[var(--card-border)] bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/member/dashboard"
                className="text-sm text-[var(--text-muted)] hover:text-[#14B8A6]"
              >
                ← Member Dashboard
              </Link>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                Job Alerts
              </h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Get notified when new jobs match your criteria
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowCreateForm(true);
              }}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#0F9488]"
            >
              Create Alert
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="mb-8 rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">
                {editingAlert ? "Edit Job Alert" : "Create Job Alert"}
              </h2>
              <button
                onClick={resetForm}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
                  Alert Name (Optional)
                </label>
                <input
                  type="text"
                  value={alertName}
                  onChange={(e) => setAlertName(e.target.value)}
                  placeholder="e.g., Software Developer Jobs in Vancouver"
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
                    Keywords
                  </label>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="e.g., developer, engineer, analyst"
                    className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Vancouver, BC"
                    className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
                  Employment Type
                </label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="">All Types</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Temporary">Temporary</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
                    Min Salary
                  </label>
                  <input
                    type="number"
                    value={minSalary}
                    onChange={(e) =>
                      setMinSalary(e.target.value ? Number(e.target.value) : "")
                    }
                    placeholder="e.g., 50000"
                    className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
                    Max Salary
                  </label>
                  <input
                    type="number"
                    value={maxSalary}
                    onChange={(e) =>
                      setMaxSalary(e.target.value ? Number(e.target.value) : "")
                    }
                    placeholder="e.g., 100000"
                    className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={remoteOnly}
                    onChange={(e) => setRemoteOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-teal-500"
                  />
                  Remote/Hybrid jobs only
                </label>

                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={indigenousOnly}
                    onChange={(e) => setIndigenousOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-teal-500"
                  />
                  Indigenous preference jobs only
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
                  Alert Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as JobAlertFrequency)}
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="instant">Instant (as jobs are posted)</option>
                  <option value="daily">Daily digest</option>
                  <option value="weekly">Weekly digest</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={processing}
                  className="rounded-md bg-accent px-6 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#0F9488] disabled:opacity-50"
                >
                  {processing
                    ? "Saving..."
                    : editingAlert
                    ? "Update Alert"
                    : "Create Alert"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md border border-[var(--card-border)] px-6 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-surface"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Alerts List */}
        <div className="space-y-6">
          {/* Active Alerts */}
          {activeAlerts.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-foreground">
                Active Alerts ({activeAlerts.length})
              </h2>
              <div className="space-y-4">
                {activeAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onEdit={startEdit}
                    onToggle={toggleAlertStatus}
                    onDelete={deleteAlert}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inactive Alerts */}
          {inactiveAlerts.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-[var(--text-muted)]">
                Inactive Alerts ({inactiveAlerts.length})
              </h2>
              <div className="space-y-4">
                {inactiveAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onEdit={startEdit}
                    onToggle={toggleAlertStatus}
                    onDelete={deleteAlert}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {alerts.length === 0 && (
            <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-[var(--text-secondary)]">
                No job alerts yet
              </h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Create your first alert to get notified about new job opportunities.
              </p>
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateForm(true);
                }}
                className="mt-6 rounded-md bg-accent px-6 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#0F9488]"
              >
                Create Your First Alert
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface AlertCardProps {
  alert: JobAlert;
  onEdit: (alert: JobAlert) => void;
  onToggle: (alertId: string, currentStatus: boolean) => void;
  onDelete: (alertId: string, alertName: string) => void;
}

function AlertCard({ alert, onEdit, onToggle, onDelete }: AlertCardProps) {
  const filters: string[] = [];
  if (alert.keyword) filters.push(`Keywords: ${alert.keyword}`);
  if (alert.location) filters.push(`Location: ${alert.location}`);
  if (alert.employmentType) filters.push(`Type: ${alert.employmentType}`);
  if (alert.minSalary) filters.push(`Min Salary: $${alert.minSalary.toLocaleString()}`);
  if (alert.maxSalary) filters.push(`Max Salary: $${alert.maxSalary.toLocaleString()}`);
  if (alert.remoteOnly) filters.push("Remote/Hybrid only");
  if (alert.indigenousOnly) filters.push("Indigenous preference only");

  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-6 transition hover:border-[var(--card-border)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">
                {alert.alertName || "Untitled Alert"}
              </h3>

              {filters.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {filters.map((filter, index) => (
                    <span
                      key={index}
                      className="rounded-full bg-surface px-3 py-1 text-xs text-[var(--text-secondary)]"
                    >
                      {filter}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 flex gap-4 text-xs text-foreground0">
                <span>Frequency: {alert.frequency}</span>
                {alert.lastSent && (
                  <span>
                    Last sent:{" "}
                    {new Date(alert.lastSent.seconds * 1000).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                alert.active
                  ? "bg-green-500/10 text-green-400"
                  : "bg-slate-500/10 text-[var(--text-muted)]"
              }`}
            >
              {alert.active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 lg:flex-col">
          <button
            onClick={() => onEdit(alert)}
            className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm text-foreground transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
          >
            Edit
          </button>

          <button
            onClick={() => onToggle(alert.id, alert.active)}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              alert.active
                ? "border border-[var(--card-border)] text-[var(--text-muted)] hover:bg-surface"
                : "bg-green-600 text-white hover:bg-green-500"
            }`}
          >
            {alert.active ? "Pause" : "Activate"}
          </button>

          <button
            onClick={() => onDelete(alert.id, alert.alertName || "")}
            className="rounded-md border border-red-500 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
