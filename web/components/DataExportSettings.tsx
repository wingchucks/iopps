"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import toast from "react-hot-toast";
import {
  Shield,
  ExternalLink,
  Download,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";

const EXPORT_CATEGORIES = [
  { key: "account", label: "Account" },
  { key: "profile", label: "Profile" },
  { key: "jobApplications", label: "Job Applications" },
  { key: "savedJobs", label: "Saved Jobs" },
  { key: "scholarshipApplications", label: "Scholarship Applications" },
  { key: "conversations", label: "Conversations" },
  { key: "notifications", label: "Notifications" },
  { key: "educationInquiries", label: "Education Inquiries" },
  { key: "eventRsvps", label: "Event RSVPs" },
  { key: "connections", label: "Connections" },
  { key: "endorsements", label: "Endorsements" },
  { key: "posts", label: "Social Posts" },
  { key: "settings", label: "Settings" },
  { key: "notificationPreferences", label: "Notification Preferences" },
  { key: "jobAlerts", label: "Job Alerts" },
  { key: "savedTraining", label: "Saved Training" },
] as const;

type CategoryKey = (typeof EXPORT_CATEGORIES)[number]["key"];

export default function DataExportSettings() {
  const { user } = useAuth();
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [selected, setSelected] = useState<Set<CategoryKey>>(
    () => new Set(EXPORT_CATEGORIES.map((c) => c.key))
  );
  const [exporting, setExporting] = useState(false);

  const allSelected = selected.size === EXPORT_CATEGORIES.length;
  const noneSelected = selected.size === 0;

  const toggle = (key: CategoryKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAll = () =>
    setSelected(new Set(EXPORT_CATEGORIES.map((c) => c.key)));
  const deselectAll = () => setSelected(new Set());

  const handleExport = async () => {
    if (!user || noneSelected) return;

    try {
      setExporting(true);
      const idToken = await user.getIdToken();
      const categories = Array.from(selected).join(",");
      const response = await fetch(
        `/api/member/export-data?format=${format}&categories=${categories}`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `iopps-data-export-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Your data has been exported!");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Error exporting data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* OCAP/CARE Compliance Banner */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-start gap-4">
          <Shield className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-emerald-300">
              Indigenous Data Sovereignty
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              IOPPS respects OCAP (Ownership, Control, Access, Possession) and
              CARE (Collective benefit, Authority to control, Responsibility,
              Ethics) principles. You have full ownership of your data and can
              export it at any time.
            </p>
            <Link
              href="/privacy"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Learn more about our data principles
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Format Selector */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="font-semibold text-white mb-4">Export Format</h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="format"
              value="json"
              checked={format === "json"}
              onChange={() => setFormat("json")}
              className="h-4 w-4 accent-emerald-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-200">JSON</span>
              <p className="text-xs text-slate-400">
                Structured data, best for developers
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="format"
              value="csv"
              checked={format === "csv"}
              onChange={() => setFormat("csv")}
              className="h-4 w-4 accent-emerald-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-200">CSV</span>
              <p className="text-xs text-slate-400">
                Spreadsheet compatible, opens in Excel
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Category Selection */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Data Categories</h3>
          <div className="flex gap-3">
            <button
              onClick={selectAll}
              disabled={allSelected}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-40 disabled:cursor-default"
            >
              Select All
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={deselectAll}
              disabled={noneSelected}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-40 disabled:cursor-default"
            >
              Deselect All
            </button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {EXPORT_CATEGORIES.map((cat) => {
            const checked = selected.has(cat.key);
            return (
              <button
                key={cat.key}
                onClick={() => toggle(cat.key)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-800/50"
              >
                {checked ? (
                  <CheckSquare className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Square className="h-5 w-5 text-slate-600 flex-shrink-0" />
                )}
                <span
                  className={`text-sm font-medium ${checked ? "text-slate-200" : "text-slate-500"}`}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Download Button */}
      <button
        onClick={handleExport}
        disabled={exporting || noneSelected}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Download My Data ({format.toUpperCase()})
          </>
        )}
      </button>

      {noneSelected && (
        <p className="text-center text-xs text-red-400">
          Please select at least one category to export.
        </p>
      )}
    </div>
  );
}
