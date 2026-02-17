'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { ContentType, EmploymentType, WorkMode } from '@/lib/types';

const CONTENT_TYPES: { key: ContentType; label: string; icon: string }[] = [
  { key: 'job', label: 'Job Posting', icon: '💼' },
  { key: 'event', label: 'Event', icon: '📅' },
  { key: 'scholarship', label: 'Scholarship / Grant', icon: '🎓' },
  { key: 'business', label: 'Business Listing', icon: '🏪' },
  { key: 'program', label: 'Program', icon: '📚' },
  { key: 'livestream', label: 'Livestream', icon: '📺' },
  { key: 'story', label: 'Success Story', icon: '⭐' },
];

const EMPLOYMENT_TYPES: EmploymentType[] = ['full-time', 'part-time', 'contract', 'casual', 'seasonal'];
const WORK_MODES: WorkMode[] = ['on-site', 'remote', 'hybrid'];

export default function CreateContentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push('/login'); return; }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth?.currentUser || !selectedType) return;
    setSubmitting(true);
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch('/api/jobs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          ...form,
          location: { city: form.city || '', province: form.province || '' },
        }),
      });
      router.push('/dashboard/posts');
    } catch { /* TODO */ }
    setSubmitting(false);
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>;

  if (!selectedType) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Create Content</h1>
        <p className="text-[var(--text-secondary)] mb-6">What would you like to post?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CONTENT_TYPES.map(ct => (
            <button key={ct.key} onClick={() => setSelectedType(ct.key)} className="card-interactive flex items-center gap-3 p-5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl text-left hover:border-[var(--accent)]">
              <span className="text-3xl">{ct.icon}</span>
              <span className="font-medium text-[var(--text-primary)]">{ct.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const inputClass = "w-full px-3 py-2 bg-[var(--background)] border border-[var(--input-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--input-focus)] outline-none";
  const labelClass = "block text-sm font-medium text-[var(--text-secondary)] mb-1";

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => { setSelectedType(null); setForm({}); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">← Back</button>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Create {CONTENT_TYPES.find(c => c.key === selectedType)?.label}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Common fields */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-4">
          <div>
            <label className={labelClass}>Title *</label>
            <input type="text" required value={form.title || ''} onChange={e => update('title', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Description *</label>
            <textarea required rows={5} value={form.description || ''} onChange={e => update('description', e.target.value)} className={`${inputClass} resize-none`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>City</label>
              <input type="text" value={form.city || ''} onChange={e => update('city', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Province</label>
              <input type="text" value={form.province || ''} onChange={e => update('province', e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Job-specific */}
        {selectedType === 'job' && (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-[var(--text-primary)]">Job Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Employment Type</label>
                <select value={form.employmentType || ''} onChange={e => update('employmentType', e.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t.replace('-', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Work Mode</label>
                <select value={form.workMode || ''} onChange={e => update('workMode', e.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  {WORK_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Salary (optional)</label>
                <input type="text" value={form.salary || ''} onChange={e => update('salary', e.target.value)} placeholder="e.g. $50,000 - $65,000" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Application Deadline</label>
                <input type="date" value={form.deadline || ''} onChange={e => update('deadline', e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Requirements</label>
              <textarea rows={3} value={form.requirements || ''} onChange={e => update('requirements', e.target.value)} className={`${inputClass} resize-none`} />
            </div>
            <div>
              <label className={labelClass}>How to Apply</label>
              <textarea rows={2} value={form.howToApply || ''} onChange={e => update('howToApply', e.target.value)} className={`${inputClass} resize-none`} />
            </div>
            <div>
              <label className={labelClass}>Contact Email</label>
              <input type="email" value={form.contactEmail || ''} onChange={e => update('contactEmail', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Listing Type</label>
              <div className="flex gap-3 mt-1">
                <button type="button" onClick={() => update('featured', 'false')} className={`flex-1 p-3 rounded-lg border text-sm font-medium text-center transition-colors ${form.featured !== 'true' ? 'border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]' : 'border-[var(--card-border)] text-[var(--text-secondary)]'}`}>
                  Standard — $125
                </button>
                <button type="button" onClick={() => update('featured', 'true')} className={`flex-1 p-3 rounded-lg border text-sm font-medium text-center transition-colors ${form.featured === 'true' ? 'border-[var(--gold)] bg-[rgba(212,168,67,0.1)] text-[var(--gold)]' : 'border-[var(--card-border)] text-[var(--text-secondary)]'}`}>
                  ⭐ Featured — $200
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Event-specific */}
        {selectedType === 'event' && (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-[var(--text-primary)]">Event Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={labelClass}>Start Date & Time</label><input type="datetime-local" value={form.startDate || ''} onChange={e => update('startDate', e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>End Date & Time</label><input type="datetime-local" value={form.endDate || ''} onChange={e => update('endDate', e.target.value)} className={inputClass} /></div>
            </div>
            <div><label className={labelClass}>Venue</label><input type="text" value={form.venue || ''} onChange={e => update('venue', e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Category</label><input type="text" value={form.eventCategory || ''} onChange={e => update('eventCategory', e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Admission Cost</label><input type="text" value={form.admissionCost || ''} onChange={e => update('admissionCost', e.target.value)} placeholder="Free or amount" className={inputClass} /></div>
          </div>
        )}

        {/* Scholarship-specific */}
        {selectedType === 'scholarship' && (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-[var(--text-primary)]">Scholarship Details</h2>
            <div><label className={labelClass}>Award Amount</label><input type="text" value={form.awardAmount || ''} onChange={e => update('awardAmount', e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Deadline</label><input type="date" value={form.deadline || ''} onChange={e => update('deadline', e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Eligibility</label><textarea rows={3} value={form.eligibility || ''} onChange={e => update('eligibility', e.target.value)} className={`${inputClass} resize-none`} /></div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.push('/dashboard/posts')} className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Cancel</button>
          <button type="submit" disabled={submitting} className="px-6 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50">
            {submitting ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </form>
    </div>
  );
}
