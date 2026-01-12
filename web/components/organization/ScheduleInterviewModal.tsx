"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { ScheduledInterviewType } from "@/lib/types";

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  applicationId: string;
  applicantName: string;
  jobTitle: string;
}

export default function ScheduleInterviewModal({
  isOpen,
  onClose,
  onSuccess,
  applicationId,
  applicantName,
  jobTitle,
}: ScheduleInterviewModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    scheduledAt: "",
    duration: "30",
    type: "virtual" as ScheduledInterviewType,
    meetingUrl: "",
    phoneNumber: "",
    location: "",
    interviewerName: "",
    interviewerEmail: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/organization/interviews", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId,
          ...formData,
          duration: parseInt(formData.duration),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to schedule interview");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule interview");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-100">Schedule Interview</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Schedule an interview with <span className="text-slate-200">{applicantName}</span> for <span className="text-slate-200">{jobTitle}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Date & Time */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Date & Time *
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              min={new Date().toISOString().slice(0, 16)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Duration *
            </label>
            <select
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
            </select>
          </div>

          {/* Interview Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Interview Type *
            </label>
            <div className="flex gap-3">
              {[
                { value: "virtual", label: "Virtual", icon: "💻" },
                { value: "phone", label: "Phone", icon: "📞" },
                { value: "in-person", label: "In-Person", icon: "🏢" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: option.value as ScheduledInterviewType })}
                  className={`flex-1 py-3 px-4 rounded-lg border text-center transition-all ${
                    formData.type === option.value
                      ? "border-[#14B8A6] bg-[#14B8A6]/10 text-[#14B8A6]"
                      : "border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <span className="text-xl block mb-1">{option.icon}</span>
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional fields based on type */}
          {formData.type === "virtual" && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Meeting URL
              </label>
              <input
                type="url"
                value={formData.meetingUrl}
                onChange={(e) => setFormData({ ...formData, meetingUrl: e.target.value })}
                placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-[#14B8A6] focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-500">
                Add your Zoom, Google Meet, or Teams link
              </p>
            </div>
          )}

          {formData.type === "phone" && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-[#14B8A6] focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-500">
                The number where you will call the candidate
              </p>
            </div>
          )}

          {formData.type === "in-person" && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Location / Address
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="123 Main St, Suite 100, City, Province"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-[#14B8A6] focus:outline-none"
              />
            </div>
          )}

          {/* Interviewer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Interviewer Name
              </label>
              <input
                type="text"
                value={formData.interviewerName}
                onChange={(e) => setFormData({ ...formData, interviewerName: e.target.value })}
                placeholder="John Smith"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-[#14B8A6] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Interviewer Email
              </label>
              <input
                type="email"
                value={formData.interviewerEmail}
                onChange={(e) => setFormData({ ...formData, interviewerEmail: e.target.value })}
                placeholder="john@company.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-[#14B8A6] focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Notes for Candidate
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Any instructions or preparation tips for the candidate..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-[#14B8A6] focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.scheduledAt}
              className="flex-1 py-2.5 px-4 rounded-lg bg-[#14B8A6] text-white font-medium hover:bg-[#0d9488] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Scheduling..." : "Schedule Interview"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
