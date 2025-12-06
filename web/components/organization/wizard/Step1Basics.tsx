"use client";

import { Dispatch, SetStateAction } from "react";

const employmentTypes = [
    "Full-time",
    "Part-time",
    "Contract",
    "Seasonal",
    "Internship",
];

interface JobData {
    title: string;
    location: string;
    employmentType: string;
    remoteFlag: boolean;
    active: boolean; // Just in case
}

interface Step1Props {
    data: JobData;
    updateData: (fields: Partial<JobData>) => void;
    onNext: () => void;
}

export default function Step1Basics({ data, updateData, onNext }: Step1Props) {
    const isValid = data.title && data.location && data.employmentType;

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-100">The Basics</h2>
                <p className="text-sm text-slate-400">
                    Let's start with the core details of the role.
                </p>
            </div>

            <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-200">
                    Job Title <span className="text-red-400">*</span>
                </label>
                <input
                    id="title"
                    type="text"
                    value={data.title}
                    onChange={(e) => updateData({ title: e.target.value })}
                    placeholder="e.g. Senior Project Manager"
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                />
            </div>

            <div>
                <label
                    htmlFor="location"
                    className="block text-sm font-medium text-slate-200"
                >
                    Location <span className="text-red-400">*</span>
                </label>
                <input
                    id="location"
                    type="text"
                    value={data.location}
                    onChange={(e) => updateData({ location: e.target.value })}
                    placeholder="e.g. Vancouver, BC or Remote"
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div>
                    <label
                        htmlFor="employmentType"
                        className="block text-sm font-medium text-slate-200"
                    >
                        Employment Type
                    </label>
                    <select
                        id="employmentType"
                        value={data.employmentType}
                        onChange={(e) => updateData({ employmentType: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                    >
                        {employmentTypes.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center pt-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <div className={`relative flex h-6 w-11 items-center rounded-full transition-colors ${data.remoteFlag ? 'bg-[#14B8A6]' : 'bg-slate-700'}`}>
                            <input
                                type="checkbox"
                                checked={data.remoteFlag}
                                onChange={(e) => updateData({ remoteFlag: e.target.checked })}
                                className="sr-only"
                            />
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${data.remoteFlag ? 'translate-x-6' : 'translate-x-1'}`} />
                        </div>
                        <span className="text-sm font-medium text-slate-200">
                            Remote / Hybrid Friendly
                        </span>
                    </label>
                </div>
            </div>

            <div className="flex justify-end pt-6">
                <button
                    onClick={onNext}
                    disabled={!isValid}
                    className="rounded-xl bg-[#14B8A6] px-8 py-3 font-semibold text-slate-900 transition-all hover:bg-[#16cdb8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Next: Description
                </button>
            </div>
        </div>
    );
}
