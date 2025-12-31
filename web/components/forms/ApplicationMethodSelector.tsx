"use client";

import { ApplicationMethod } from "@/lib/types";

interface ApplicationMethodSelectorProps {
  method: ApplicationMethod;
  email: string;
  url: string;
  onMethodChange: (method: ApplicationMethod) => void;
  onEmailChange: (email: string) => void;
  onUrlChange: (url: string) => void;
  disabled?: boolean;
}

const APPLICATION_METHODS: {
  value: ApplicationMethod;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "email",
    label: "By Email",
    description: "Candidates send resume to email",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
        <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
      </svg>
    ),
  },
  {
    value: "url",
    label: "By URL",
    description: "Redirect to external application page",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
        <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
      </svg>
    ),
  },
  {
    value: "quickApply",
    label: "Quick Apply (IOPPS)",
    description: "Use IOPPS built-in application system",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

export function ApplicationMethodSelector({
  method,
  email,
  url,
  onMethodChange,
  onEmailChange,
  onUrlChange,
  disabled = false,
}: ApplicationMethodSelectorProps) {
  return (
    <div className="space-y-4">
      {/* Method Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {APPLICATION_METHODS.map((m) => (
          <label
            key={m.value}
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              method === m.value
                ? "border-[#14B8A6] bg-[#14B8A6]/10"
                : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input
              type="radio"
              name="applicationMethod"
              value={m.value}
              checked={method === m.value}
              onChange={(e) => onMethodChange(e.target.value as ApplicationMethod)}
              disabled={disabled}
              className="mt-1 w-4 h-4 border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6] focus:ring-offset-slate-900"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[#14B8A6]">{m.icon}</span>
                <span className="text-sm font-medium text-slate-100">{m.label}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">{m.description}</div>
            </div>
          </label>
        ))}
      </div>

      {/* Email Input */}
      {method === "email" && (
        <div>
          <label className="block text-sm text-slate-300 mb-2">
            Application Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="hr@company.com"
            disabled={disabled}
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#14B8A6]"
          />
          <p className="text-xs text-slate-500 mt-1">
            Candidates will be instructed to send their application to this email address.
          </p>
        </div>
      )}

      {/* URL Input */}
      {method === "url" && (
        <div>
          <label className="block text-sm text-slate-300 mb-2">
            Application URL <span className="text-red-400">*</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://careers.company.com/apply/job-123"
            disabled={disabled}
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#14B8A6]"
          />
          <p className="text-xs text-slate-500 mt-1">
            Candidates will be redirected to this URL to complete their application.
          </p>
        </div>
      )}

      {/* Quick Apply Info */}
      {method === "quickApply" && (
        <div className="flex items-start gap-3 p-4 bg-[#14B8A6]/10 border border-[#14B8A6]/30 rounded-xl">
          <svg
            className="w-5 h-5 text-[#14B8A6] mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-sm text-slate-200 font-medium">IOPPS Quick Apply Enabled</p>
            <p className="text-sm text-slate-400 mt-1">
              Candidates can apply directly through IOPPS using their saved profile and resume.
              You&apos;ll receive applications in your IOPPS employer dashboard.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicationMethodSelector;
