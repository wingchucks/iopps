"use client";

import { type Conference } from "@/lib/types";

interface ProtocolsTabProps {
    conference: Conference;
    onChange: (updates: Partial<Conference>) => void;
}

export function ProtocolsTab({ conference, onChange }: ProtocolsTabProps) {
    return (
        <div className="p-6 max-w-3xl space-y-8">
            <div className="rounded-xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 p-4">
                <p className="text-sm text-[#14B8A6]">
                    IOPPS encourages all events to follow respectful Indigenous protocols. Use this section to outline how your event honors local territories and traditions.
                </p>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-200">
                        Territory Acknowledgement
                    </label>
                    <p className="text-xs text-slate-500 mb-2">Whose traditional territory is the event taking place on?</p>
                    <textarea
                        rows={3}
                        value={conference.territoryAcknowledgement || ""}
                        onChange={(e) => onChange({ territoryAcknowledgement: e.target.value })}
                        placeholder="We acknowledge that we are gathering on the traditional territory of..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-200">
                        Elder Acknowledgement / Opening
                    </label>
                    <p className="text-xs text-slate-500 mb-2">Will an Elder be providing an opening prayer or welcome?</p>
                    <textarea
                        rows={2}
                        value={conference.elderAcknowledgement || ""}
                        onChange={(e) => onChange({ elderAcknowledgement: e.target.value })}
                        placeholder="Opening prayer will be provided by Elder..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-200">
                        Cultural Protocols
                    </label>
                    <p className="text-xs text-slate-500 mb-2">Any specific protocols attendees should be aware of?</p>
                    <textarea
                        rows={3}
                        value={conference.indigenousProtocols || ""}
                        onChange={(e) => onChange({ indigenousProtocols: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                    />
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                    <input
                        type="checkbox"
                        checked={conference.trc92Commitment || false}
                        onChange={(e) => onChange({ trc92Commitment: e.target.checked })}
                        className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-[#14B8A6] focus:ring-[#14B8A6]"
                        id="trc92"
                    />
                    <label htmlFor="trc92" className="cursor-pointer">
                        <span className="block text-sm font-medium text-slate-200">Commitment to TRC Call to Action #92</span>
                        <span className="block text-xs text-slate-400">
                            Identify this event as committed to business reconciliation and Indigenous economic empowerment.
                        </span>
                    </label>
                </div>
            </div>
        </div>
    );
}
