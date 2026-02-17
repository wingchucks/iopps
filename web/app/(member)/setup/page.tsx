'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import type { AccountType, Interest, OrgType } from '@/lib/types';

// ─── Constants ───────────────────────────────────────────────────────────
const PROVINCES = [
  'Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador',
  'Northwest Territories','Nova Scotia','Nunavut','Ontario','Prince Edward Island',
  'Quebec','Saskatchewan','Yukon',
];

const NATIONS = [
  'Cree','Ojibwe','Anishinaabe','Dene','Blackfoot','Mi\'kmaq','Inuit','Métis',
  'Mohawk','Haida','Tlingit','Salish','Stó:lō','Nisga\'a','Squamish','Musqueam',
  'Tsimshian','Nuu-chah-nulth','Kwakwaka\'wakw','Siksika','Piikani','Kainai',
  'Nakoda','Dakota','Lakota','Algonquin','Attawapiskat','Oji-Cree','Innu','Wendat',
];

const INTERESTS: { value: Interest; label: string }[] = [
  { value: 'jobs', label: 'Jobs' },
  { value: 'events', label: 'Events' },
  { value: 'scholarships', label: 'Scholarships' },
  { value: 'businesses', label: 'Businesses' },
  { value: 'schools', label: 'Schools' },
  { value: 'livestreams', label: 'Livestreams' },
];

const ORG_TYPES: { value: OrgType; label: string }[] = [
  { value: 'employer', label: 'Employer' },
  { value: 'school', label: 'School' },
  { value: 'business', label: 'Business' },
  { value: 'band_council', label: 'Band Council' },
  { value: 'nonprofit', label: 'Non-Profit' },
];

const INDUSTRIES = [
  'Healthcare','Education','Technology','Construction','Government','Mining & Resources',
  'Social Services','Retail','Tourism & Hospitality','Arts & Culture','Legal','Finance',
  'Environmental','Agriculture','Transportation','Other',
];

const ORG_SIZES = ['1-10','11-50','51-200','201-500','500+'];

const AVATAR_COLORS = ['#0D9488','#0F2B4C','#D4A843','#ef4444','#8b5cf6','#ec4899','#f97316','#22c55e'];

// ─── Styles ──────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', border: '1px solid var(--input-border)',
  borderRadius: '8px', fontSize: '15px', background: 'var(--card-bg)', color: 'var(--text-primary)', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' };
const btnPrimary: React.CSSProperties = {
  padding: '12px 24px', background: 'var(--teal)', color: '#fff', border: 'none',
  borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', minHeight: '48px',
};
const btnSecondary: React.CSSProperties = {
  padding: '12px 24px', background: 'var(--card-bg)', color: 'var(--text-primary)',
  border: '1px solid var(--input-border)', borderRadius: '8px', fontSize: '15px', cursor: 'pointer', minHeight: '48px',
};

// ─── Main Component ─────────────────────────────────────────────────────
export default function SetupPage() {
  const router = useRouter();
  const [uid, setUid] = useState('');
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Community member fields
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [avatarColor, setAvatarColor] = useState<string | null>(null);
  const [initials, setInitials] = useState('');
  const [nation, setNation] = useState('');
  const [nationSearch, setNationSearch] = useState('');
  const [showNationDropdown, setShowNationDropdown] = useState(false);
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [headline, setHeadline] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [interests, setInterests] = useState<Interest[]>([]);
  const [bio, setBio] = useState('');
  const [digestFreq, setDigestFreq] = useState<'daily' | 'weekly' | 'off'>('daily');

  // Org fields
  const [orgPrimaryType, setOrgPrimaryType] = useState<OrgType | null>(null);
  const [orgSecondaryType, setOrgSecondaryType] = useState<OrgType | null>(null);
  const [orgName, setOrgName] = useState('');
  const [orgLogoFile, setOrgLogoFile] = useState<File | null>(null);
  const [orgLogoURL, setOrgLogoURL] = useState<string | null>(null);
  const [orgIndustry, setOrgIndustry] = useState('');
  const [orgSize, setOrgSize] = useState('');
  const [orgProvince, setOrgProvince] = useState('');
  const [orgCity, setOrgCity] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [orgIndigenousOwned, setOrgIndigenousOwned] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const orgFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) { router.push('/login'); return; }
      setUid(user.uid);
      const names = (user.displayName || '').split(' ');
      setInitials(((names[0]?.[0] || '') + (names[1]?.[0] || '')).toUpperCase());
      if (db) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setAccountType(data.accountType || 'community_member');
          if (data.profileComplete) { router.push('/feed'); return; }
        } else {
          setAccountType('community_member');
        }
      }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  const filteredNations = NATIONS.filter(n => n.toLowerCase().includes(nationSearch.toLowerCase()));

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setAvatarColor(null);
    const reader = new FileReader();
    reader.onload = ev => setPhotoURL(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleOrgLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOrgLogoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setOrgLogoURL(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function selectAvatar(color: string) {
    setAvatarColor(color);
    setPhotoFile(null);
    setPhotoURL(null);
  }

  function addSkill() {
    const s = skillInput.trim();
    if (s && skills.length < 3 && !skills.includes(s)) {
      setSkills([...skills, s]);
      setSkillInput('');
    }
  }

  function removeSkill(i: number) {
    setSkills(skills.filter((_, idx) => idx !== i));
  }

  function toggleInterest(val: Interest) {
    setInterests(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }

  function validateStep(): boolean {
    setError('');
    if (accountType === 'community_member') {
      if (step === 1 && !photoFile && !avatarColor) { setError('Please upload a photo or select an avatar.'); return false; }
      if (step === 2 && (!nation || !province || !city.trim())) { setError('Please fill in all fields.'); return false; }
      if (step === 3 && (!headline.trim() || skills.length === 0)) { setError('Headline and at least 1 skill are required.'); return false; }
      if (step === 4 && interests.length === 0) { setError('Select at least one interest.'); return false; }
    } else {
      if (step === 1 && !orgPrimaryType) { setError('Please select a primary type.'); return false; }
      if (step === 2 && (!orgName.trim() || !orgIndustry || !orgSize)) { setError('Please fill in all required fields.'); return false; }
      if (step === 3 && (!orgProvince || !orgCity.trim())) { setError('Province and city are required.'); return false; }
      if (step === 4 && !orgDescription.trim()) { setError('Description is required.'); return false; }
    }
    return true;
  }

  function handleNext() {
    if (validateStep()) {
      if (step < 4) setStep(step + 1);
      else handleComplete();
    }
  }

  async function handleComplete() {
    if (!db || !uid) return;
    setSaving(true);
    setError('');
    try {
      if (accountType === 'community_member') {
        let finalPhotoURL = photoURL;
        if (photoFile && storage) {
          const storageRef = ref(storage, `avatars/${uid}`);
          await uploadBytes(storageRef, photoFile);
          finalPhotoURL = await getDownloadURL(storageRef);
        } else if (avatarColor) {
          finalPhotoURL = `avatar:${avatarColor}:${initials}`;
        }
        await updateDoc(doc(db, 'users', uid), {
          photoURL: finalPhotoURL,
          nation, province, city,
          headline, skills, interests, bio,
          emailDigest: { frequency: digestFreq, categories: {}, lastSentAt: null, unsubscribedAt: null },
          profileComplete: true,
          updatedAt: serverTimestamp(),
        });
      } else {
        let finalLogoURL = orgLogoURL;
        if (orgLogoFile && storage) {
          const storageRef = ref(storage, `org-logos/${uid}`);
          await uploadBytes(storageRef, orgLogoFile);
          finalLogoURL = await getDownloadURL(storageRef);
        }
        const orgId = uid; // owner uid as org id for now
        await setDoc(doc(db, 'organizations', orgId), {
          id: orgId,
          name: orgName,
          slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          primaryType: orgPrimaryType,
          secondaryType: orgSecondaryType,
          logoURL: finalLogoURL,
          industry: orgIndustry,
          size: orgSize,
          province: orgProvince,
          city: orgCity,
          address: orgAddress,
          website: orgWebsite,
          description: orgDescription,
          indigenousOwned: orgIndigenousOwned,
          indigenousOwnedVerified: false,
          verification: 'unverified',
          subscription: { tier: 'none', stripeCustomerId: null, stripeSubscriptionId: null, currentPeriodEnd: null, featuredJobsUsed: 0, featuredJobsTotal: 0, featuredProgramsUsed: 0, featuredProgramsTotal: 0, promotionPostsUsed: 0, promotionPostsTotal: 0, jobPostsUsed: 0, jobPostsLimit: null },
          feedSync: { enabled: false, url: '', type: null, lastSync: null, jobCount: 0, credentials: null },
          teamMemberIds: [uid],
          teamMembers: [{ uid, role: 'admin', email: '' }],
          ownerUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          disabled: false,
        }, { merge: true });
        await updateDoc(doc(db, 'users', uid), { profileComplete: true, updatedAt: serverTimestamp() });
      }
      router.push('/feed');
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
    </div>
  );

  // ─── Progress Bar ─────────────────────────────────────────────────────
  const progressBar = (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        {[1,2,3,4].map(s => (
          <div key={s} style={{
            width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 600,
            background: s <= step ? 'var(--teal)' : 'var(--surface-raised)',
            color: s <= step ? '#fff' : 'var(--text-muted)',
          }}>{s}</div>
        ))}
      </div>
      <div style={{ height: '4px', background: 'var(--surface-raised)', borderRadius: '2px' }}>
        <div style={{ height: '100%', width: `${((step - 1) / 3) * 100}%`, background: 'var(--teal)', borderRadius: '2px', transition: 'width 0.3s' }} />
      </div>
    </div>
  );

  const navButtons = (
    <div style={{ display: 'flex', gap: '12px', marginTop: '1.5rem' }}>
      {step > 1 && <button onClick={() => { setStep(step - 1); setError(''); }} style={btnSecondary}>Back</button>}
      <button onClick={handleNext} disabled={saving} style={{ ...btnPrimary, flex: 1, opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving…' : step === 4 ? 'Complete Setup' : 'Next'}
      </button>
    </div>
  );

  // ─── Community Member Steps ────────────────────────────────────────────
  function renderCommunityStep() {
    if (step === 1) return (
      <div>
        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--navy)', fontSize: '1.25rem' }}>Profile Photo</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 1.5rem' }}>Upload a photo or choose an avatar</p>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <div onClick={() => fileInputRef.current?.click()} style={{
            width: '96px', height: '96px', borderRadius: '50%', cursor: 'pointer',
            background: photoURL ? `url(${photoURL}) center/cover` : avatarColor || 'var(--surface-raised)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '3px solid var(--card-border)', fontSize: photoURL ? 0 : '2rem', color: '#fff', fontWeight: 700,
          }}>
            {!photoURL && avatarColor && initials}
            {!photoURL && !avatarColor && <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Upload</span>}
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', margin: '0 0 1rem' }}>Or select a default avatar:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          {AVATAR_COLORS.map(c => (
            <button key={c} onClick={() => selectAvatar(c)} style={{
              width: '48px', height: '48px', borderRadius: '50%', background: c, border: avatarColor === c ? '3px solid var(--navy)' : '3px solid transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: '14px',
            }}>{initials}</button>
          ))}
        </div>
      </div>
    );

    if (step === 2) return (
      <div>
        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--navy)', fontSize: '1.25rem' }}>Identity & Location</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 1.5rem' }}>Tell us about yourself</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <label style={labelStyle}>Nation / Band / Community</label>
            <input value={nationSearch || nation} onChange={e => { setNationSearch(e.target.value); setNation(''); setShowNationDropdown(true); }}
              onFocus={() => setShowNationDropdown(true)} onBlur={() => setTimeout(() => setShowNationDropdown(false), 200)}
              style={inputStyle} placeholder="Search…" />
            {showNationDropdown && filteredNations.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '200px', overflowY: 'auto',
                background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', zIndex: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}>
                {filteredNations.map(n => (
                  <button key={n} onMouseDown={() => { setNation(n); setNationSearch(''); setShowNationDropdown(false); }}
                    style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}>
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Province / Territory</label>
            <select value={province} onChange={e => setProvince(e.target.value)} style={inputStyle}>
              <option value="">Select…</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>City</label>
            <input value={city} onChange={e => setCity(e.target.value)} style={inputStyle} placeholder="e.g. Saskatoon" />
          </div>
        </div>
      </div>
    );

    if (step === 3) return (
      <div>
        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--navy)', fontSize: '1.25rem' }}>Professional</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 1.5rem' }}>What do you do?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Headline / Title</label>
            <input value={headline} onChange={e => setHeadline(e.target.value)} style={inputStyle} placeholder="e.g. Registered Nurse" />
          </div>
          <div>
            <label style={labelStyle}>Skills (up to 3)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                style={{ ...inputStyle, flex: 1 }} placeholder="Type and press Enter" disabled={skills.length >= 3} />
              <button onClick={addSkill} disabled={skills.length >= 3} style={{ ...btnPrimary, padding: '12px 16px', opacity: skills.length >= 3 ? 0.5 : 1 }}>Add</button>
            </div>
            {skills.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {skills.map((s, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 12px', background: 'var(--accent-light)', color: 'var(--teal)', borderRadius: '9999px', fontSize: '14px' }}>
                    {s} <button onClick={() => removeSkill(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--teal)', fontSize: '16px', padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );

    return (
      <div>
        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--navy)', fontSize: '1.25rem' }}>Interests & Bio</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 1.5rem' }}>What are you looking for?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Interests (select at least 1)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {INTERESTS.map(({ value, label }) => (
                <button key={value} onClick={() => toggleInterest(value)} style={{
                  padding: '8px 16px', borderRadius: '9999px', fontSize: '14px', cursor: 'pointer', minHeight: '40px',
                  background: interests.includes(value) ? 'var(--teal)' : 'var(--card-bg)',
                  color: interests.includes(value) ? '#fff' : 'var(--text-primary)',
                  border: `1px solid ${interests.includes(value) ? 'var(--teal)' : 'var(--input-border)'}`,
                }}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Bio (optional)</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Tell us a bit about yourself…" />
          </div>
          <div>
            <label style={labelStyle}>Email Digest</label>
            <select value={digestFreq} onChange={e => setDigestFreq(e.target.value as typeof digestFreq)} style={inputStyle}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="off">Off</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  // ─── Organization Steps ────────────────────────────────────────────────
  function renderOrgStep() {
    if (step === 1) return (
      <div>
        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--navy)', fontSize: '1.25rem' }}>Organization Type</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 1.5rem' }}>What kind of organization are you?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Primary Type *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {ORG_TYPES.map(({ value, label }) => (
                <button key={value} onClick={() => setOrgPrimaryType(value)} style={{
                  padding: '10px 18px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', minHeight: '48px',
                  background: orgPrimaryType === value ? 'var(--teal)' : 'var(--card-bg)',
                  color: orgPrimaryType === value ? '#fff' : 'var(--text-primary)',
                  border: `1px solid ${orgPrimaryType === value ? 'var(--teal)' : 'var(--input-border)'}`,
                }}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Secondary Type (optional)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {ORG_TYPES.filter(t => t.value !== orgPrimaryType).map(({ value, label }) => (
                <button key={value} onClick={() => setOrgSecondaryType(orgSecondaryType === value ? null : value)} style={{
                  padding: '10px 18px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', minHeight: '48px',
                  background: orgSecondaryType === value ? 'var(--accent-light)' : 'var(--card-bg)',
                  color: orgSecondaryType === value ? 'var(--teal)' : 'var(--text-primary)',
                  border: `1px solid ${orgSecondaryType === value ? 'var(--teal)' : 'var(--input-border)'}`,
                }}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );

    if (step === 2) return (
      <div>
        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--navy)', fontSize: '1.25rem' }}>Organization Identity</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 1.5rem' }}>Tell us about your organization</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Organization Name *</label>
            <input value={orgName} onChange={e => setOrgName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Logo (optional)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '8px', flexShrink: 0,
                background: orgLogoURL ? `url(${orgLogoURL}) center/cover` : 'var(--surface-raised)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--card-border)', fontSize: orgLogoURL ? 0 : '12px', color: 'var(--text-muted)',
              }}>{!orgLogoURL && 'Logo'}</div>
              <button onClick={() => orgFileInputRef.current?.click()} style={{ ...btnSecondary, fontSize: '14px', padding: '8px 16px' }}>Upload</button>
              <input ref={orgFileInputRef} type="file" accept="image/*" onChange={handleOrgLogoSelect} style={{ display: 'none' }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Industry *</label>
            <select value={orgIndustry} onChange={e => setOrgIndustry(e.target.value)} style={inputStyle}>
              <option value="">Select…</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Organization Size *</label>
            <select value={orgSize} onChange={e => setOrgSize(e.target.value)} style={inputStyle}>
              <option value="">Select…</option>
              {ORG_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>
    );

    if (step === 3) return (
      <div>
        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--navy)', fontSize: '1.25rem' }}>Location</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 1.5rem' }}>Where is your organization based?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Province / Territory *</label>
            <select value={orgProvince} onChange={e => setOrgProvince(e.target.value)} style={inputStyle}>
              <option value="">Select…</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>City *</label>
            <input value={orgCity} onChange={e => setOrgCity(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Street Address (optional)</label>
            <input value={orgAddress} onChange={e => setOrgAddress(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Website (optional)</label>
            <input value={orgWebsite} onChange={e => setOrgWebsite(e.target.value)} style={inputStyle} placeholder="https://" />
          </div>
        </div>
      </div>
    );

    return (
      <div>
        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--navy)', fontSize: '1.25rem' }}>About</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 1.5rem' }}>Describe your organization</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Description *</label>
            <textarea value={orgDescription} onChange={e => setOrgDescription(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Tell the community about your organization…" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}>
            <input type="checkbox" checked={orgIndigenousOwned} onChange={e => setOrgIndigenousOwned(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--teal)' }} />
            Indigenous-Owned (self-declaration)
          </label>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '0.25rem' }}>
        <span style={{ color: 'var(--teal)' }}>I</span>OPPS
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '2rem' }}>Complete your profile</p>

      <div style={{ width: '100%', maxWidth: '480px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {progressBar}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '1rem' }}>{error}</div>
        )}

        {accountType === 'community_member' ? renderCommunityStep() : renderOrgStep()}
        {navButtons}
      </div>
    </div>
  );
}
