'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function ResumePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [resumeURL, setResumeURL] = useState<string | null>(null);
  const [resumeName, setResumeName] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/member/profile', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setResumeURL(data.resumeURL || null);
          setResumeName(data.resumeURL ? 'resume.pdf' : null);
        }
      } catch { /* TODO */ }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth?.currentUser) return;
    setUploading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const formData = new FormData();
      formData.append('resume', file);
      const res = await fetch('/api/resume', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (res.ok) { const data = await res.json(); setResumeURL(data.url); setResumeName(file.name); }
    } catch { /* TODO */ }
    setUploading(false);
  };

  const handleDelete = async () => {
    if (!auth?.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch('/api/resume', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setResumeURL(null);
      setResumeName(null);
    } catch { /* TODO */ }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Resume</h1>

      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
        {resumeURL ? (
          <div>
            <div className="flex items-center gap-3 p-4 bg-[var(--surface-raised)] rounded-lg">
              <span className="text-2xl">📄</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--text-primary)] truncate">{resumeName}</p>
                <a href={resumeURL} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--accent)] hover:underline">View resume</a>
              </div>
              <button onClick={handleDelete} className="px-3 py-1.5 text-sm text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">Remove</button>
            </div>
            <div className="mt-4">
              <button onClick={() => fileRef.current?.click()} className="text-sm text-[var(--accent)] hover:underline">Replace resume</button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-[var(--text-primary)] font-medium">Upload your resume</p>
            <p className="text-sm text-[var(--text-muted)] mt-1 mb-4">PDF or Word document, max 5MB</p>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50">
              {uploading ? 'Uploading...' : 'Choose File'}
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleUpload} className="hidden" />
      </div>
    </div>
  );
}
