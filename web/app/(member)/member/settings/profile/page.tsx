'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { UserProfile, Interest } from '@/lib/types';

const INTEREST_OPTIONS: Interest[] = ['jobs', 'events', 'scholarships', 'businesses', 'schools', 'livestreams'];
const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const data = await res.json(); setProfile(data.profile || {}); }
      } catch { /* TODO */ }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  const handleSave = async () => {
    if (!auth?.currentUser) return;
    setSaving(true);
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
    } catch { /* TODO */ }
    setSaving(false);
  };

  const update = (field: string, value: unknown) => setProfile(prev => ({ ...prev, [field]: value }));

  const toggleInterest = (interest: Interest) => {
    const current = profile.interests || [];
    update('interests', current.includes(interest) ? current.filter(i => i !== interest) : [...current, interest]);
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Edit Profile</h1>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-[var(--text-primary)]">Basic Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">First Name</label>
              <input type="text" value={profile.firstName || ''} onChange={e => update('firstName', e.target.value)} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--input-focus)] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Last Name</label>
              <input type="text" value={profile.lastName || ''} onChange={e => update('lastName', e.target.value)} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--input-focus)] outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Headline</label>
            <input type="text" value={profile.headline || ''} onChange={e => update('headline', e.target.value)} placeholder="e.g. Registered Nurse" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--input-focus)] outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nation / Band / Community</label>
            <input type="text" value={profile.nation || ''} onChange={e => update('nation', e.target.value)} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--input-focus)] outline-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Province</label>
              <select value={profile.province || ''} onChange={e => update('province', e.target.value)} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--input-focus)] outline-none">
                <option value="">Select...</option>
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">City</label>
              <input type="text" value={profile.city || ''} onChange={e => update('city', e.target.value)} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--input-focus)] outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Bio</label>
            <textarea value={profile.bio || ''} onChange={e => update('bio', e.target.value)} rows={3} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--input-focus)] outline-none resize-none" />
          </div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
          <h2 className="font-semibold text-[var(--text-primary)] mb-3">Interests</h2>
          <p className="text-sm text-[var(--text-muted)] mb-3">Select what you&apos;re interested in to personalize your feed.</p>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map(interest => {
              const selected = profile.interests?.includes(interest);
              return (
                <button key={interest} onClick={() => toggleInterest(interest)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selected ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                  {interest.charAt(0).toUpperCase() + interest.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
          <h2 className="font-semibold text-[var(--text-primary)] mb-3">Skills</h2>
          <p className="text-sm text-[var(--text-muted)] mb-3">Add up to 3 skills.</p>
          <div className="space-y-2">
            {[0, 1, 2].map(i => (
              <input key={i} type="text" value={profile.skills?.[i] || ''} onChange={e => {
                const skills = [...(profile.skills || [])];
                skills[i] = e.target.value;
                update('skills', skills.filter(Boolean));
              }} placeholder={`Skill ${i + 1}`} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--input-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--input-focus)] outline-none" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
