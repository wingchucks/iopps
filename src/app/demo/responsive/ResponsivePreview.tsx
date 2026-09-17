"use client";

import { useState } from "react";

const pages = [
  ["/demo/employer", "Employer overview"],
  ["/demo/employer?tab=Post%20a%20Job", "Demo job posting"],
  ["/demo/employer?tab=Applicants", "Demo applicants"],
  ["/demo/employer?workspace=business", "Business workspace"],
  ["/demo/employer?workspace=business&tab=Profile", "Business profile editor"],
  ["/demo/business-review", "Business listing review"],
  ["/demo/opportunities", "Events and funding editor"],
  ["/events", "Events directory"],
  ["/scholarships", "Scholarships and funding directory"],
  ["/businesses", "Business directory"],
  ["/", "Homepage"],
  ["/jobs", "Job board"],
  ["/livestreams", "IOPPS Live"],
] as const;
const sizes = [[320, "Small phone"], [390, "Phone"], [768, "Tablet"], [1280, "Desktop"]] as const;

export default function ResponsivePreview() {
  const [path, setPath] = useState<string>(pages[0][0]);
  const [width, setWidth] = useState(390);

  return <div className="min-h-screen bg-slate-100 text-slate-900 p-4 md:p-8">
    <header className="mx-auto max-w-5xl mb-6">
      <p className="text-sm font-bold text-teal-700">IOPPS · PREVIEW REVIEW</p>
      <h1 className="text-2xl font-bold mt-2">One experience. Every screen.</h1>
      <p className="mt-2 text-sm">Explore the current preview at different screen widths. Demo actions use fictional data and do not publish anything.</p>
      <div className="flex flex-wrap gap-4 mt-5">
        <label className="flex flex-col gap-1 text-sm font-semibold">Page
          <select value={path} onChange={event => setPath(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3">
            {pages.map(([url, label]) => <option key={url} value={url}>{label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Screen size
          <select value={width} onChange={event => setWidth(Number(event.target.value))} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3">
            {sizes.map(([pixels, label]) => <option key={pixels} value={pixels}>{label} · {pixels}px</option>)}
          </select>
        </label>
        <a href={path} target="_blank" rel="noopener noreferrer" className="self-end min-h-11 inline-flex items-center text-teal-800 underline">Open full page ↗</a>
      </div>
    </header>
    <div className="overflow-x-auto pb-4">
      <iframe key={path} title="Website preview" src={path}
        className="block mx-auto rounded-2xl border-2 border-slate-300 bg-white shadow-lg"
        style={{ width, height: 850, maxWidth: "none" }} />
    </div>
  </div>;
}
