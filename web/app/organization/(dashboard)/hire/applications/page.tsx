'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { listEmployerApplications, updateApplicationStatus, addApplicantNote, updateApplicantRating } from '@/lib/firestore';
import type { JobApplication, ApplicationStatus } from '@/lib/types';
import {
  DocumentTextIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  Squares2X2Icon,
  ListBulletIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  EllipsisVerticalIcon,
  ChevronDownIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { formatDistanceToNow } from 'date-fns';

// Pipeline stages in order
const PIPELINE_STAGES: { status: ApplicationStatus; label: string; color: string }[] = [
  { status: 'submitted', label: 'New', color: 'border-blue-500' },
  { status: 'reviewed', label: 'Reviewed', color: 'border-slate-500' },
  { status: 'shortlisted', label: 'Shortlisted', color: 'border-amber-500' },
  { status: 'interviewing', label: 'Interview', color: 'border-purple-500' },
  { status: 'offered', label: 'Offered', color: 'border-cyan-500' },
  { status: 'hired', label: 'Hired', color: 'border-green-500' },
];

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; bgColor: string }> = {
  submitted: { label: 'New', color: 'text-blue-400', bgColor: 'bg-blue-900/30' },
  reviewed: { label: 'Reviewed', color: 'text-slate-400', bgColor: 'bg-slate-700/50' },
  shortlisted: { label: 'Shortlisted', color: 'text-amber-400', bgColor: 'bg-amber-900/30' },
  interviewing: { label: 'Interviewing', color: 'text-purple-400', bgColor: 'bg-purple-900/30' },
  offered: { label: 'Offered', color: 'text-cyan-400', bgColor: 'bg-cyan-900/30' },
  rejected: { label: 'Rejected', color: 'text-red-400', bgColor: 'bg-red-900/30' },
  hired: { label: 'Hired', color: 'text-green-400', bgColor: 'bg-green-900/30' },
  withdrawn: { label: 'Withdrawn', color: 'text-slate-500', bgColor: 'bg-slate-800/50' },
};

// Email templates
const EMAIL_TEMPLATES = {
  interview: {
    subject: 'Interview Invitation - [Job Title]',
    body: `Dear [Candidate Name],

Thank you for your application for the [Job Title] position. We were impressed by your background and would like to invite you for an interview.

Please let us know your availability for the coming week, and we will schedule a time that works for both of us.

We look forward to speaking with you.

Best regards,
[Your Name]`,
  },
  rejection: {
    subject: 'Application Update - [Job Title]',
    body: `Dear [Candidate Name],

Thank you for your interest in the [Job Title] position and for taking the time to apply.

After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.

We appreciate your interest in our organization and wish you the best in your job search.

Best regards,
[Your Name]`,
  },
  offer: {
    subject: 'Job Offer - [Job Title]',
    body: `Dear [Candidate Name],

We are pleased to extend an offer for the [Job Title] position!

We were impressed by your qualifications and believe you would be a great addition to our team.

Please find the offer details attached. We would appreciate your response within [X] business days.

Welcome aboard!

Best regards,
[Your Name]`,
  },
};

type ViewMode = 'kanban' | 'list';

export default function HireApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState<keyof typeof EMAIL_TEMPLATES | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [activeApplication, setActiveApplication] = useState<JobApplication | null>(null);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [draggedApp, setDraggedApp] = useState<JobApplication | null>(null);
  const [filterJob, setFilterJob] = useState<string>('all');

  // Get unique jobs for filtering
  const uniqueJobs = Array.from(new Set(applications.map(a => a.jobId)))
    .map(jobId => {
      const app = applications.find(a => a.jobId === jobId);
      return { id: jobId, title: (app as any)?.jobTitle || jobId };
    });

  useEffect(() => {
    async function loadApplications() {
      if (!user) return;
      try {
        const appsList = await listEmployerApplications(user.uid);
        setApplications(appsList);
      } catch (error) {
        console.error('Error loading applications:', error);
      } finally {
        setLoading(false);
      }
    }
    loadApplications();
  }, [user]);

  const filteredApplications = filterJob === 'all' 
    ? applications 
    : applications.filter(a => a.jobId === filterJob);

  // Group applications by status for Kanban
  const groupedByStatus = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.status] = filteredApplications.filter(a => a.status === stage.status);
    return acc;
  }, {} as Record<ApplicationStatus, JobApplication[]>);

  // Selection handlers
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredApplications.map(a => a.id)));
    setShowBulkActions(true);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setShowBulkActions(false);
  };

  // Bulk status update
  const bulkUpdateStatus = async (status: ApplicationStatus) => {
    if (!user || selectedIds.size === 0) return;
    setSaving(true);
    try {
      for (const id of selectedIds) {
        await updateApplicationStatus(id, status, { changedBy: user.uid });
      }
      // Refresh
      const appsList = await listEmployerApplications(user.uid);
      setApplications(appsList);
      clearSelection();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setSaving(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (app: JobApplication) => {
    setDraggedApp(app);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetStatus: ApplicationStatus) => {
    if (!draggedApp || !user || draggedApp.status === targetStatus) {
      setDraggedApp(null);
      return;
    }

    try {
      await updateApplicationStatus(draggedApp.id, targetStatus, { changedBy: user.uid });
      // Optimistic update
      setApplications(prev => prev.map(a => 
        a.id === draggedApp.id ? { ...a, status: targetStatus } : a
      ));
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setDraggedApp(null);
    }
  };

  // Add note handler
  const handleAddNote = async () => {
    if (!activeApplication || !user || !noteText.trim()) return;
    setSaving(true);
    try {
      await addApplicantNote(activeApplication.id, { 
        content: noteText.trim(), 
        createdBy: user.uid 
      });
      setNoteText('');
      setShowNoteModal(false);
      // Refresh applications
      const appsList = await listEmployerApplications(user.uid);
      setApplications(appsList);
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle rating update
  const handleRatingUpdate = async (appId: string, rating: number) => {
    try {
      await updateApplicantRating(appId, rating);
      // Optimistic update
      setApplications(prev => prev.map(a => 
        a.id === appId ? { ...a, rating } : a
      ));
    } catch (error) {
      console.error('Error updating rating:', error);
    }
  };

  // Rating component
  const RatingStars = ({ appId, rating }: { appId: string; rating: number }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={(e) => {
            e.stopPropagation();
            handleRatingUpdate(appId, star);
          }}
          className="cursor-pointer hover:scale-110 transition-transform"
        >
          {star <= rating ? (
            <StarIconSolid className="w-4 h-4 text-amber-400" />
          ) : (
            <StarIcon className="w-4 h-4 text-slate-600 hover:text-amber-300" />
          )}
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
          <p className="text-[var(--text-muted)] mt-1">
            {applications.length} total • {applications.filter(a => a.status === 'submitted').length} new
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Job Filter */}
          {uniqueJobs.length > 1 && (
            <select
              value={filterJob}
              onChange={(e) => setFilterJob(e.target.value)}
              className="px-3 py-2 bg-surface border border-[var(--card-border)] rounded-lg text-sm text-foreground"
            >
              <option value="all">All Jobs</option>
              {uniqueJobs.map(job => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
          )}
          {/* View Toggle */}
          <div className="flex bg-surface border border-[var(--card-border)] rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 ${viewMode === 'kanban' ? 'bg-accent/20 text-accent' : 'text-[var(--text-muted)]'}`}
              title="Kanban view"
            >
              <Squares2X2Icon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-accent/20 text-accent' : 'text-[var(--text-muted)]'}`}
              title="List view"
            >
              <ListBulletIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="flex items-center justify-between p-4 bg-accent/10 border border-accent/20 rounded-xl">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-sm text-[var(--text-muted)] hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => bulkUpdateStatus('shortlisted')}
              disabled={saving}
              className="px-3 py-1.5 text-sm bg-amber-900/30 text-amber-400 rounded-lg hover:bg-amber-900/50"
            >
              Shortlist
            </button>
            <button
              onClick={() => bulkUpdateStatus('interviewing')}
              disabled={saving}
              className="px-3 py-1.5 text-sm bg-purple-900/30 text-purple-400 rounded-lg hover:bg-purple-900/50"
            >
              Interview
            </button>
            <button
              onClick={() => {
                setEmailTemplate('rejection');
                setShowEmailModal(true);
              }}
              disabled={saving}
              className="px-3 py-1.5 text-sm bg-red-900/30 text-red-400 rounded-lg hover:bg-red-900/50"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {applications.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <DocumentTextIcon className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-2">
            No applications yet
          </h3>
          <p className="text-foreground0 max-w-md mx-auto">
            Applications will appear here when candidates apply to your jobs.
          </p>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban View */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map(stage => (
            <div
              key={stage.status}
              className="flex-shrink-0 w-72"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage.status)}
            >
              <div className={`bg-card border-t-4 ${stage.color} border border-card-border rounded-xl`}>
                <div className="p-3 border-b border-[var(--card-border)]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">{stage.label}</h3>
                    <span className="text-sm text-[var(--text-muted)]">
                      {groupedByStatus[stage.status]?.length || 0}
                    </span>
                  </div>
                </div>
                <div className="p-2 space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto">
                  {groupedByStatus[stage.status]?.map(app => (
                    <div
                      key={app.id}
                      draggable
                      onDragStart={() => handleDragStart(app)}
                      className={`p-3 bg-surface rounded-lg border border-[var(--card-border)] cursor-grab active:cursor-grabbing hover:border-accent/30 transition-colors ${
                        draggedApp?.id === app.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(app.id)}
                          onChange={() => toggleSelect(app.id)}
                          className="mt-1 rounded border-[var(--card-border)]"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">
                            {app.memberDisplayName || app.memberEmail || 'Anonymous'}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            {app.createdAt
                              ? formatDistanceToNow(
                                  app.createdAt instanceof Date
                                    ? app.createdAt
                                    : app.createdAt.toDate(),
                                  { addSuffix: true }
                                )
                              : 'recently'}
                          </p>
                          {/* Rating */}
                          <div className="mt-2">
                            <RatingStars appId={app.id} rating={app.rating || 0} />
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setActiveApplication(app);
                            setShowNoteModal(true);
                          }}
                          className="p-1 text-[var(--text-muted)] hover:text-foreground"
                          title="Add note"
                        >
                          <ChatBubbleLeftIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {/* Rejected Column */}
          <div
            className="flex-shrink-0 w-72"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop('rejected')}
          >
            <div className="bg-card border-t-4 border-red-500 border border-card-border rounded-xl opacity-60">
              <div className="p-3 border-b border-[var(--card-border)]">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Rejected</h3>
                  <span className="text-sm text-[var(--text-muted)]">
                    {applications.filter(a => a.status === 'rejected').length}
                  </span>
                </div>
              </div>
              <div className="p-2 min-h-[100px] text-center">
                <p className="text-xs text-[var(--text-muted)] mt-8">
                  Drag here to reject
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface">
                <tr>
                  <th className="w-10 p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredApplications.length && filteredApplications.length > 0}
                      onChange={() => selectedIds.size === filteredApplications.length ? clearSelection() : selectAll()}
                      className="rounded border-[var(--card-border)]"
                    />
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-[var(--text-muted)]">Candidate</th>
                  <th className="text-left p-3 text-sm font-medium text-[var(--text-muted)]">Status</th>
                  <th className="text-left p-3 text-sm font-medium text-[var(--text-muted)]">Rating</th>
                  <th className="text-left p-3 text-sm font-medium text-[var(--text-muted)]">Applied</th>
                  <th className="text-left p-3 text-sm font-medium text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map(app => (
                  <tr key={app.id} className="border-t border-[var(--card-border)] hover:bg-surface/50">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(app.id)}
                        onChange={() => toggleSelect(app.id)}
                        className="rounded border-[var(--card-border)]"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-[var(--text-muted)]" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {app.memberDisplayName || app.memberEmail || 'Anonymous'}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">{app.memberEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <select
                        value={app.status}
                        onChange={(e) => updateApplicationStatus(app.id, e.target.value as ApplicationStatus, { changedBy: user?.uid })}
                        className={`px-2 py-1 rounded text-xs font-medium ${STATUS_CONFIG[app.status].bgColor} ${STATUS_CONFIG[app.status].color} border-0`}
                      >
                        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                          <option key={status} value={status}>{config.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <RatingStars appId={app.id} rating={app.rating || 0} />
                    </td>
                    <td className="p-3 text-sm text-[var(--text-muted)]">
                      {app.createdAt
                        ? formatDistanceToNow(
                            app.createdAt instanceof Date
                              ? app.createdAt
                              : app.createdAt.toDate(),
                            { addSuffix: true }
                          )
                        : 'recently'}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setActiveApplication(app);
                            setShowNoteModal(true);
                          }}
                          className="p-1.5 text-[var(--text-muted)] hover:text-foreground rounded hover:bg-surface"
                          title="Add note"
                        >
                          <ChatBubbleLeftIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setActiveApplication(app);
                            setEmailTemplate('interview');
                            setShowEmailModal(true);
                          }}
                          className="p-1.5 text-[var(--text-muted)] hover:text-foreground rounded hover:bg-surface"
                          title="Send email"
                        >
                          <EnvelopeIcon className="w-4 h-4" />
                        </button>
                        <Link
                          href={`/organization/applications/${app.id}`}
                          className="p-1.5 text-[var(--text-muted)] hover:text-accent rounded hover:bg-surface"
                          title="View details"
                        >
                          <DocumentTextIcon className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && activeApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-2">Add Note</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Private note for {activeApplication.memberDisplayName || 'this candidate'}
            </p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write your note here..."
              rows={4}
              className="w-full rounded-xl border border-[var(--card-border)] bg-surface px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none resize-none"
            />
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setNoteText('');
                }}
                className="px-4 py-2 text-sm text-foreground border border-[var(--card-border)] rounded-xl hover:border-[var(--card-border)]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                disabled={saving || !noteText.trim()}
                className="px-4 py-2 text-sm font-medium bg-accent text-slate-950 rounded-xl hover:bg-accent/90 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Add Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Template Modal */}
      {showEmailModal && emailTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {emailTemplate === 'interview' && 'Interview Invitation'}
              {emailTemplate === 'rejection' && 'Rejection Email'}
              {emailTemplate === 'offer' && 'Job Offer'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Subject</label>
                <input
                  type="text"
                  defaultValue={EMAIL_TEMPLATES[emailTemplate].subject}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-surface px-4 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Message</label>
                <textarea
                  defaultValue={EMAIL_TEMPLATES[emailTemplate].body}
                  rows={10}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-surface px-4 py-3 text-sm text-foreground font-mono resize-none"
                />
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Replace [bracketed text] with actual values before sending.
              </p>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailTemplate(null);
                }}
                className="px-4 py-2 text-sm text-foreground border border-[var(--card-border)] rounded-xl"
              >
                Cancel
              </button>
              {emailTemplate === 'rejection' && selectedIds.size > 0 && (
                <button
                  onClick={async () => {
                    await bulkUpdateStatus('rejected');
                    setShowEmailModal(false);
                    setEmailTemplate(null);
                  }}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-xl hover:bg-red-700"
                >
                  {saving ? 'Processing...' : `Reject ${selectedIds.size} & Send`}
                </button>
              )}
              <button
                className="px-4 py-2 text-sm font-medium bg-accent text-slate-950 rounded-xl hover:bg-accent/90"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
