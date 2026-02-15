"use client";

import { type Conference, type ConferenceFAQ } from "@/lib/types";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

interface FAQTabProps {
    conference: Conference;
    onChange: (updates: Partial<Conference>) => void;
}

export function FAQTab({ conference, onChange }: FAQTabProps) {
    const faqs = conference.faqs || [];

    const addFAQ = () => {
        const newFAQ: ConferenceFAQ = { question: "", answer: "" };
        onChange({ faqs: [...faqs, newFAQ] });
    };

    const removeFAQ = (index: number) => {
        const newFAQs = [...faqs];
        newFAQs.splice(index, 1);
        onChange({ faqs: newFAQs });
    };

    const updateFAQ = (index: number, updates: Partial<ConferenceFAQ>) => {
        const newFAQs = [...faqs];
        newFAQs[index] = { ...newFAQs[index], ...updates };
        onChange({ faqs: newFAQs });
    };

    return (
        <div className="p-6 max-w-3xl space-y-6">
            {faqs.map((faq, index) => (
                <div key={index} className="relative rounded-lg border border-[var(--card-border)] bg-surface p-4">
                    <button
                        onClick={() => removeFAQ(index)}
                        className="absolute top-2 right-2 p-1 text-foreground0 hover:text-red-400"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>

                    <div className="space-y-3 pr-8">
                        <input
                            type="text"
                            value={faq.question}
                            onChange={(e) => updateFAQ(index, { question: e.target.value })}
                            placeholder="Question e.g. What is the refund policy?"
                            className="w-full rounded bg-surface border border-[var(--card-border)] px-3 py-2 text-sm text-white focus:border-[#14B8A6] focus:outline-none font-medium"
                        />
                        <textarea
                            rows={2}
                            value={faq.answer}
                            onChange={(e) => updateFAQ(index, { answer: e.target.value })}
                            placeholder="Answer..."
                            className="w-full rounded bg-surface border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--text-secondary)] focus:border-[#14B8A6] focus:outline-none"
                        />
                    </div>
                </div>
            ))}

            <button
                onClick={addFAQ}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--card-border)] bg-slate-800/20 py-4 text-sm text-[var(--text-muted)] hover:bg-surface hover:text-white"
            >
                <PlusIcon className="h-5 w-5" />
                Add FAQ Item
            </button>
        </div>
    );
}
