'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { 
  getJobApplication, 
  updateApplicationStatus, 
  addApplicantNote,
  updateApplicantRating,
  getJobPosting,
} from '@/lib/firestore';
import type { JobApplication, ApplicationStatus, JobPosting } from '@/lib/types';
import { InterviewScheduler } from '@/components/employer/InterviewScheduler';
import type { InterviewSlot } from '@/components/employer/InterviewScheduler';
import type { Timestamp } from 'firebase/firestore';
import {
  ArrowLeftIcon,
  UserIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ChatBubbleLeftIcon,
  StarIcon,
  PhoneIcon,
  LinkIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { format, formatDistanceToNow } from 'date-fns';

const STATUS_OPTIONS: { value: ApplicationStatus; label: string; color: string }[] = [
  { value: 'submitted', label: 'New', color: 'bg-blue-900/30 text-blue-400' },
  { value: 'reviewed', label: 'Reviewed', color: 'bg-slate-700/50 text-slate-400' },
  { value: 'shortlisted', label: 'Shortlisted', color: 'bg-amber-900/30 text-amber-400' },
  { value: 'interviewing', label: 'Interviewing', color: 'bg-purple-900/30 text-purple-400' },
  { value: 'offered', label: 'Offered', color: 'bg-cyan-900/30 text-cyan-400' },
  { value: 'hired', label: 'Hired', color: 'bg-green-900/30 text-green-400' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-900/30 text-red-400' },
];

export default function ApplicationDetailPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  
  const [application, setApplication] = useState<JobApplication | null>(null);
  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!applicationId) return;
      try {
        const appData = await getJobApplication(applicationId);
        setApplication(appData);
        
        if (appData?.jobId) {
          const jobData = await getJobPosting(appData.jobId);
          setJob(jobData);
        }
      } catch (error) {
        console.error('Error loading application:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [applicationId]);

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    if (!application || !user) return;
    setSaving(true);
    try {
      await updateApplicationStatus(application.id, newStatus, { changedBy: user.uid });
      setApplication({ ...application, status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRatingChange = async (rating: number) => {
    if (!application) return;
    try {
      await updateApplicantRating(application.id, rating);
      setApplication({ ...application, rating });
    } catch (error) {
      console.error('Error updating rating:', error);
    }
  };

  const handleAddNote = async () => {
    if (!application || !user || !noteText.trim()) return;
    setSaving(true);
    try {
      await addApplicantNote(application.id, {
        content: noteText.trim(),
        createdBy: user.uid,
      });
      setNoteText('');
      // Reload to get updated notes
      const appData = await getJobApplication(applicationId);
      setApplication(appData);
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleInterview = async (slot: InterviewSlot) => {
    // TODO: Save interview to database and send email
    console.log('Interview scheduled:', slot);
    setShowScheduler(false);
    // Update status to interviewing
    await handleStatusChange('interviewing');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Application not found</p>
        <Link href="/organization/hire/applications" className="text-accent hover:underline mt-2 inline-block">
          Back to Applications
        </Link>
      </div>
    );
  }

  const currentStatus = STATUS_OPTIONS.find(s => s.value === application.status);
  const createdDate = application.createdAt instanceof Date 
    ? application.createdAt 
    : application.createdAt?.toDate();

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/organization/hire/applications"
        className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-foreground"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Applications
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center">
            <UserIcon className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {application.memberDisplayName || 'Anonymous Candidate'}
            </h1>
            {application.memberEmail && (
              <a href={`mailto:${application.memberEmail}`} className="text-accent hover:underline flex items-center gap-1 mt-1">
                <EnvelopeIcon className="w-4 h-4" />
                {application.memberEmail}
              </a>
            )}
            {createdDate && (
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Applied {formatDistanceToNow(createdDate, { addSuffix: true })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Rating */}
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => handleRatingChange(star)}
                className="hover:scale-110 transition-transform"
              >
                {star <= (application.rating || 0) ? (
                  <StarIconSolid className="w-5 h-5 text-amber-400" />
                ) : (
                  <StarIcon className="w-5 h-5 text-slate-600 hover:text-amber-300" />
                )}
              </button>
            ))}
          </div>

          {/* Status dropdown */}
          <select
            value={application.status}
            onChange={(e) => handleStatusChange(e.target.value as ApplicationStatus)}
            disabled={saving}
            className={`px-3 py-2 rounded-lg text-sm font-medium border-0 ${currentStatus?.color}`}
          >
            {STATUS_OPTIONS.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Job Info */}
      {job && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-sm text-[var(--text-muted)]">Applied for</p>
          <Link href={`/organization/jobs/${job.id}/edit`} className="text-lg font-medium text-foreground hover:text-accent">
            {job.title}
          </Link>
          <p className="text-sm text-[var(--text-muted)]">{job.location}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cover Letter */}
          {(application.coverLetter || application.coverLetterContent) && (
            <div className="bg-card border border-card-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-accent" />
                Cover Letter
              </h3>
              <div className="prose prose-invert prose-sm max-w-none">
                {application.coverLetterContent || application.coverLetter}
              </div>
            </div>
          )}

          {/* Interest Statement */}
          {application.interestStatement && (
            <div className="bg-card border border-card-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-3">Interest Statement</h3>
              <p className="text-[var(--text-secondary)]">{application.interestStatement}</p>
            </div>
          )}

          {/* Attachments */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <PaperClipIcon className="w-5 h-5 text-accent" />
              Attachments
            </h3>
            <div className="space-y-2">
              {application.resumeUrl && (
                <a
                  href={application.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-surface rounded-lg hover:bg-accent/10 transition-colors"
                >
                  <DocumentTextIcon className="w-5 h-5 text-accent" />
                  <span className="text-foreground">Resume</span>
                  <LinkIcon className="w-4 h-4 text-[var(--text-muted)] ml-auto" />
                </a>
              )}
              {application.coverLetterUrl && (
                <a
                  href={application.coverLetterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-surface rounded-lg hover:bg-accent/10 transition-colors"
                >
                  <DocumentTextIcon className="w-5 h-5 text-purple-400" />
                  <span className="text-foreground">Cover Letter (PDF)</span>
                  <LinkIcon className="w-4 h-4 text-[var(--text-muted)] ml-auto" />
                </a>
              )}
              {application.portfolioURL && (
                <a
                  href={application.portfolioURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-surface rounded-lg hover:bg-accent/10 transition-colors"
                >
                  <LinkIcon className="w-5 h-5 text-blue-400" />
                  <span className="text-foreground">Portfolio</span>
                  <LinkIcon className="w-4 h-4 text-[var(--text-muted)] ml-auto" />
                </a>
              )}
              {!application.resumeUrl && !application.coverLetterUrl && !application.portfolioURL && (
                <p className="text-[var(--text-muted)] text-sm">No attachments</p>
              )}
            </div>
          </div>

          {/* Stage History */}
          {application.stageHistory && application.stageHistory.length > 0 && (
            <div className="bg-card border border-card-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5 text-accent" />
                Timeline
              </h3>
              <div className="space-y-3">
                {application.stageHistory.map((entry, i) => {
                  const entryDate = entry.timestamp instanceof Date
                    ? entry.timestamp
                    : (entry.timestamp as Timestamp)?.toDate?.();
                  const statusConfig = STATUS_OPTIONS.find(s => s.value === entry.status);
                  
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${statusConfig?.color.split(' ')[0] || 'bg-slate-500'}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {statusConfig?.label || entry.status}
                        </p>
                        {entryDate && (
                          <p className="text-xs text-[var(--text-muted)]">
                            {format(entryDate, 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                        {entry.note && (
                          <p className="text-xs text-[var(--text-secondary)] mt-1">{entry.note}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-card border border-card-border rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-foreground">Actions</h3>
            <button
              onClick={() => setShowScheduler(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-slate-950 rounded-xl font-medium hover:bg-accent/90"
            >
              <CalendarDaysIcon className="w-5 h-5" />
              Schedule Interview
            </button>
            {application.memberEmail && (
              <a
                href={`mailto:${application.memberEmail}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-surface border border-[var(--card-border)] text-foreground rounded-xl hover:bg-surface/80"
              >
                <EnvelopeIcon className="w-5 h-5" />
                Send Email
              </a>
            )}
            <button
              onClick={() => handleStatusChange('rejected')}
              disabled={saving || application.status === 'rejected'}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-900/30 disabled:opacity-50"
            >
              Reject Candidate
            </button>
          </div>

          {/* Notes */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <ChatBubbleLeftIcon className="w-5 h-5 text-accent" />
              Notes
            </h3>
            
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {application.employerNotes?.map((note) => {
                const noteDate = note.createdAt instanceof Date
                  ? note.createdAt
                  : (note.createdAt as Timestamp)?.toDate?.();
                return (
                  <div key={note.id} className="p-3 bg-surface rounded-lg">
                    <p className="text-sm text-foreground">{note.content}</p>
                    {noteDate && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {formatDistanceToNow(noteDate, { addSuffix: true })}
                      </p>
                    )}
                  </div>
                );
              })}
              {(!application.employerNotes || application.employerNotes.length === 0) && (
                <p className="text-sm text-[var(--text-muted)]">No notes yet</p>
              )}
            </div>

            <div className="space-y-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a private note..."
                rows={3}
                className="w-full rounded-xl border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground resize-none focus:border-accent focus:outline-none"
              />
              <button
                onClick={handleAddNote}
                disabled={saving || !noteText.trim()}
                className="w-full px-4 py-2 text-sm font-medium bg-surface border border-[var(--card-border)] text-foreground rounded-xl hover:bg-accent/10 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Note'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interview Scheduler Modal */}
      {showScheduler && (
        <InterviewScheduler
          candidateName={application.memberDisplayName || 'Candidate'}
          candidateEmail={application.memberEmail}
          jobTitle={job?.title || 'Position'}
          onSchedule={handleScheduleInterview}
          onCancel={() => setShowScheduler(false)}
        />
      )}
    </div>
  );
}
