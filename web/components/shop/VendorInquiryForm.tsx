'use client';

import { useState } from 'react';
import { EnvelopeIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface VendorInquiryFormProps {
  vendorId: string;
  vendorName: string;
  productId?: string;
  productName?: string;
  themeColor?: string;
}

export default function VendorInquiryForm({
  vendorId,
  vendorName,
  productId,
  productName,
  themeColor = '#14b8a6',
}: VendorInquiryFormProps) {
  const [formData, setFormData] = useState({
    senderName: '',
    senderEmail: '',
    senderPhone: '',
    subject: productName ? `Inquiry about ${productName}` : '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/vendor/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          productId,
          ...formData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: 'Your inquiry has been sent! The business owner will respond to your email.',
        });
        setFormData({
          senderName: '',
          senderEmail: '',
          senderPhone: '',
          subject: '',
          message: '',
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to send inquiry. Please try again.',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${themeColor}20` }}
        >
          <EnvelopeIcon className="h-5 w-5" style={{ color: themeColor }} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Send an Inquiry</h3>
          <p className="text-sm text-slate-400">Contact {vendorName} directly</p>
        </div>
      </div>

      {result && (
        <div
          className={`mb-4 rounded-lg p-4 ${
            result.success
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-red-500/10 border border-red-500/20'
          }`}
        >
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircleIcon className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <p className={result.success ? 'text-emerald-400' : 'text-red-400'}>
              {result.message}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Your Name *
            </label>
            <input
              type="text"
              required
              value={formData.senderName}
              onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
              className="w-full rounded-lg bg-slate-700/50 border border-slate-600 px-4 py-2.5 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Your Email *
            </label>
            <input
              type="email"
              required
              value={formData.senderEmail}
              onChange={(e) => setFormData({ ...formData, senderEmail: e.target.value })}
              className="w-full rounded-lg bg-slate-700/50 border border-slate-600 px-4 py-2.5 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Phone (Optional)
          </label>
          <input
            type="tel"
            value={formData.senderPhone}
            onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
            className="w-full rounded-lg bg-slate-700/50 border border-slate-600 px-4 py-2.5 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
            placeholder="(555) 123-4567"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Subject *
          </label>
          <input
            type="text"
            required
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="w-full rounded-lg bg-slate-700/50 border border-slate-600 px-4 py-2.5 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
            placeholder="What is your inquiry about?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Message *
          </label>
          <textarea
            required
            rows={4}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full rounded-lg bg-slate-700/50 border border-slate-600 px-4 py-2.5 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none resize-none"
            placeholder="Tell them what you're interested in..."
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: themeColor,
            boxShadow: `0 10px 15px -3px ${themeColor}40`,
          }}
        >
          {submitting ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Sending...
            </>
          ) : (
            <>
              <EnvelopeIcon className="h-5 w-5" />
              Send Inquiry
            </>
          )}
        </button>
      </form>
    </div>
  );
}
