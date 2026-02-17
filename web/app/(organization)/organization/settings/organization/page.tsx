'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { Organization, OrgType } from '@/lib/types';

const ORG_TYPES: { key: OrgType; label: string }[] = [
  { key: 'employer', label: 'Employer' },
  { key: 'school', label: 'School / Education' },
  { key: 'business', label: 'Business' },
  { key: 'band_council', label: 'Band Council' },
  { key: 'nonprofit', label: 'Non-Profit' },
];

const SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

export default function OrgSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [org, setOrg] = useState<Partial<Organization>>({});

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/org/dashboard', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const data = await res.json(); setOrg(data.org || {}); }
      } catch { /* TODO */ }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  const update = (field: string, value: unknown) => setOrg(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!auth?.currentUser) return;
    setSaving(true);
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch('/api/org/settings', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(org),
      });
    } catch { /* TODO */ }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>;

  const inputClass = "w-full px-3 py-2 bg-[var(--background)] border border-[var(--input-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--input-focus)] outline-none";
  const labelClass = "block text-sm font-medium text-[var(--text-secondary)] mb-1";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Organization Settings</h1>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-[var(--text-primary)]">Basic Info</h2>
          <div>
            <label className={labelClass}>Organization Name</label>
            <input type="text" value={org.name || ''} onChange={e => update('name', e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Type</label>
              <select value={org.primaryType || ''} onChange={e => update('primaryType', e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                {ORG_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Industry</label>
              <input type="text" value={org.industry || ''} onChange={e => update('industry', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Size</label>
              <select value={org.size || ''} onChange={e => update('size', e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                {SIZES.map(s => <option key={s} value={s}>{s} employees</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Website</label>
              <input type="url" value={org.website || ''} onChange={e => update('website', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea rows={4} value={org.description || ''} onChange={e => update('description', e.target.value)} className={`${inputClass} resize-none`} />
          </div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-[var(--text-primary)]">Location</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={labelClass}>City</label><input type="text" value={org.city || ''} onChange={e => update('city', e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Province</label><input type="text" value={org.province || ''} onChange={e => update('province', e.target.value)} className={inputClass} /></div>
          </div>
          <div><label className={labelClass}>Address</label><input type="text" value={org.address || ''} onChange={e => update('address', e.target.value)} className={inputClass} /></div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-[var(--text-primary)]">Indigenous Ownership</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={org.indigenousOwned || false} onChange={e => update('indigenousOwned', e.target.checked)} className="w-4 h-4 rounded border-[var(--input-border)] text-[var(--accent)] focus:ring-[var(--accent)]" />
            <span className="text-sm text-[var(--text-primary)]">This is an Indigenous-owned organization</span>
          </label>
        </div>
      </div>
    </div>
  );
}
