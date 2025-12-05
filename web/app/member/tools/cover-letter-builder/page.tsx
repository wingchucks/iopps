"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { PageShell } from "@/components/PageShell";
import { ArrowDownTrayIcon, PrinterIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Template Designs
const TEMPLATES = {
    minimal: "minimal",
    modern: "modern",
    bold: "bold",
};

export default function CoverLetterBuilder() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const letterRef = useRef<HTMLDivElement>(null);

    const [design, setDesign] = useState<keyof typeof TEMPLATES>("modern");
    const [formData, setFormData] = useState({
        fullName: user?.displayName || "",
        email: user?.email || "",
        phone: "",
        address: "",
        recipientName: "",
        recipientTitle: "",
        companyName: "",
        companyAddress: "",
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        opening: "Dear Hiring Manager,",
        body1: "I am writing to express my strong interest in the [Job Title] position at [Company Name]. With my background in [Your Field] and my passion for [Relevant Passion], I believe I would be a valuable asset to your team.",
        body2: "In my previous role at [Previous Company], I successfully [Achievement 1]. I have developed skills in [Skill 1], [Skill 2], and [Skill 3] which align well with the requirements of this role.",
        body3: "I am excited about the opportunity to contribute to [Company Name]'s mission. Thank you for considering my application. I look forward to the possibility of discussing how my experience and skills can benefit your organization.",
        closing: "Sincerely,",
        signOff: user?.displayName || "[Your Name]",
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const generatePDF = async () => {
        if (!letterRef.current) return;
        setLoading(true);

        try {
            const element = letterRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false
            });
            const imgData = canvas.toDataURL("image/jpeg", 1.0);

            // A4 Dimensions in mm
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
            pdf.save(`Cover_Letter_${formData.companyName || "Draft"}.pdf`);

        } catch (err) {
            console.error("PDF Generation failed:", err);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageShell>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* EDITOR COLUMN */}
                    <div className="w-full lg:w-1/3 space-y-6">
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-2">Cover Letter Builder</h1>
                            <p className="text-slate-400 text-sm">Create a professional cover letter in minutes.</p>
                        </div>

                        {/* Design Selector */}
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <label className="block text-xs font-semibold uppercase text-slate-500 mb-3 tracking-wider">Select Design</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setDesign(t)}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all ${design === t
                                                ? "bg-[#14B8A6] text-slate-900 shadow-lg shadow-[#14B8A6]/20"
                                                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                            }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Input Form */}
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                            <h2 className="text-sm font-semibold text-white border-b border-slate-700 pb-2">Your Information</h2>
                            <div className="grid grid-cols-1 gap-3">
                                <input type="text" name="fullName" placeholder="Full Name" value={formData.fullName} onChange={handleInputChange} className="input-field" />
                                <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleInputChange} className="input-field" />
                                <input type="text" name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleInputChange} className="input-field" />
                                <input type="text" name="address" placeholder="Address (City, Province)" value={formData.address} onChange={handleInputChange} className="input-field" />
                            </div>

                            <h2 className="text-sm font-semibold text-white border-b border-slate-700 pb-2 pt-2">Recipient Info</h2>
                            <div className="grid grid-cols-1 gap-3">
                                <input type="text" name="recipientName" placeholder="Recipient Name (e.g. Hiring Manager)" value={formData.recipientName} onChange={handleInputChange} className="input-field" />
                                <input type="text" name="recipientTitle" placeholder="Recipient Title" value={formData.recipientTitle} onChange={handleInputChange} className="input-field" />
                                <input type="text" name="companyName" placeholder="Company Name" value={formData.companyName} onChange={handleInputChange} className="input-field" />
                                <input type="text" name="companyAddress" placeholder="Company Address" value={formData.companyAddress} onChange={handleInputChange} className="input-field" />
                            </div>

                            <h2 className="text-sm font-semibold text-white border-b border-slate-700 pb-2 pt-2">Content</h2>
                            <div className="grid grid-cols-1 gap-3">
                                <input type="text" name="opening" placeholder="Opening Salutation" value={formData.opening} onChange={handleInputChange} className="input-field" />
                                <textarea name="body1" rows={4} placeholder="Introduction Paragraph" value={formData.body1} onChange={handleInputChange} className="input-field resize-none leading-relaxed" />
                                <textarea name="body2" rows={4} placeholder="Experience Paragraph" value={formData.body2} onChange={handleInputChange} className="input-field resize-none leading-relaxed" />
                                <textarea name="body3" rows={4} placeholder="Conclusion Paragraph" value={formData.body3} onChange={handleInputChange} className="input-field resize-none leading-relaxed" />
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" name="closing" placeholder="Closing (Sincerely,)" value={formData.closing} onChange={handleInputChange} className="input-field" />
                                    <input type="text" name="signOff" placeholder="Name to sign" value={formData.signOff} onChange={handleInputChange} className="input-field" />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={generatePDF}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#14B8A6] to-[#0B8A7A] text-slate-900 font-bold py-3 px-6 rounded-xl hover:shadow-lg hover:shadow-[#14B8A6]/20 transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                            ) : (
                                <ArrowDownTrayIcon className="h-5 w-5" />
                            )}
                            {loading ? "Generating..." : "Download PDF"}
                        </button>

                        <style jsx>{`
              .input-field {
                width: 100%;
                background: rgba(15, 23, 42, 0.6);
                border: 1px solid rgba(51, 65, 85, 0.5);
                border-radius: 0.5rem;
                padding: 0.5rem 0.75rem;
                color: #e2e8f0;
                font-size: 0.875rem;
                transition: all 0.2s;
              }
              .input-field:focus {
                outline: none;
                border-color: #14B8A6;
                background: rgba(15, 23, 42, 0.8);
              }
            `}</style>
                    </div>

                    {/* PREVIEW COLUMN */}
                    <div className="w-full lg:w-2/3 bg-slate-900 rounded-xl border border-slate-800 p-8 flex items-center justify-center overflow-hidden">
                        <div className="scale-[0.85] transform-origin-top shadow-2xl">
                            {/* DOCUMENT A4 PAGE */}
                            <div
                                ref={letterRef}
                                className={`bg-white text-slate-800 w-[210mm] min-h-[297mm] p-[25mm] shadow-xl mx-auto flex flex-col
                  ${design === 'minimal' ? 'font-serif' : design === 'modern' ? 'font-sans' : 'font-sans'}
                `}
                                style={{
                                    backgroundColor: 'white', // Ensure white bg for PDF capture
                                    color: '#1e293b' // Slate-800 fallback
                                }}
                            >
                                {/* HEADER */}
                                {design === 'bold' && (
                                    <div className="mb-10 border-b-4 border-teal-600 pb-6">
                                        <h1 className="text-4xl font-black text-teal-800 uppercase tracking-tight mb-2">{formData.fullName}</h1>
                                        <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-500">
                                            {formData.email && <span>{formData.email}</span>}
                                            {formData.phone && <span>• {formData.phone}</span>}
                                            {formData.address && <span>• {formData.address}</span>}
                                        </div>
                                    </div>
                                )}

                                {design === 'modern' && (
                                    <div className="mb-10 flex justify-between items-start border-b border-slate-200 pb-8">
                                        <div>
                                            <h1 className="text-3xl font-bold text-slate-900 mb-2">{formData.fullName}</h1>
                                            <p className="text-teal-600 font-medium text-lg">Applicant</p>
                                        </div>
                                        <div className="text-right text-sm text-slate-500 leading-relaxed">
                                            <p>{formData.email}</p>
                                            <p>{formData.phone}</p>
                                            <p>{formData.address}</p>
                                        </div>
                                    </div>
                                )}

                                {design === 'minimal' && (
                                    <div className="mb-12 text-center">
                                        <h1 className="text-2xl font-semibold text-slate-900 uppercase tracking-widest mb-3">{formData.fullName}</h1>
                                        <div className="text-sm text-slate-500 flex justify-center gap-4">
                                            <span>{formData.email}</span>
                                            <span>{formData.phone}</span>
                                        </div>
                                        <div className="text-sm text-slate-500 mt-1">{formData.address}</div>
                                        <div className="w-12 h-0.5 bg-slate-300 mx-auto mt-6"></div>
                                    </div>
                                )}


                                {/* CONTENT */}
                                <div className="flex-grow space-y-6 text-[11pt] leading-relaxed relative z-10">
                                    <div className="flex justify-between items-end mb-8">
                                        {/* RECIPIENT */}
                                        <div className="text-sm text-slate-600">
                                            <p className="font-bold text-slate-900">{formData.recipientName}</p>
                                            <p>{formData.recipientTitle}</p>
                                            <p>{formData.companyName}</p>
                                            <p>{formData.companyAddress}</p>
                                        </div>
                                        {/* DATE */}
                                        <div className="text-sm font-medium text-slate-500">
                                            {formData.date}
                                        </div>
                                    </div>

                                    <p className="mb-6">{formData.opening}</p>

                                    <div className="space-y-4 text-slate-700">
                                        <p className="whitespace-pre-wrap">{formData.body1}</p>
                                        <p className="whitespace-pre-wrap">{formData.body2}</p>
                                        <p className="whitespace-pre-wrap">{formData.body3}</p>
                                    </div>

                                    <div className="mt-12">
                                        <p className="mb-4">{formData.closing}</p>
                                        <p className="font-semibold text-lg">{formData.signOff}</p>
                                    </div>
                                </div>

                                {/* FOOTER DECORATION - Modern Only */}
                                {design === 'modern' && (
                                    <div className="mt-auto pt-8 border-t border-slate-100 flex justify-between items-center text-xs text-slate-300">
                                        <span>Generated via IOPPS</span>
                                        <span>iopps.ca</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PageShell>
    );
}
