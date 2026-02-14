'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import {
  listEmployerTemplates,
  deleteJobTemplate,
  incrementTemplateUsage,
} from '@/lib/firestore';
import { createJobFromTemplate } from '@/lib/firestore';
import type { JobTemplate } from '@/lib/types';
import {
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  BriefcaseIcon,
  MapPinIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

export default function JobTemplatesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    async function loadTemplates() {
      if (!user) return;
      try {
        const list = await listEmployerTemplates(user.uid);
        setTemplates(list);
      } catch (error) {
        console.error('Error loading templates:', error);
      } finally {
        setLoading(false);
      }
    }
    loadTemplates();
  }, [user]);

  const handleCreateFromTemplate = async (templateId: string) => {
    if (!user || creating) return;
    setCreating(templateId);
    try {
      const newJobId = await createJobFromTemplate(templateId, user.uid);
      if (newJobId) {
        await incrementTemplateUsage(templateId);
        router.push(`/organization/jobs/${newJobId}/edit`);
      }
    } catch (error) {
      console.error('Error creating job from template:', error);
    } finally {
      setCreating(null);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!user || deleting) return;
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    setDeleting(templateId);
    try {
      await deleteJobTemplate(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (error) {
      console.error('Error deleting template:', error);
    } finally {
      setDeleting(null);
    }
  };

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
          <h1 className="text-2xl font-bold text-foreground">Job Templates</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Save time by reusing job posting templates
          </p>
        </div>
        <Link
          href="/organization/jobs/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Post New Job
        </Link>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-4">
        <p className="text-blue-300 text-sm">
          💡 <strong>Tip:</strong> Create a template by clicking &quot;Save as Template&quot; when editing any job posting.
        </p>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <DocumentTextIcon className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-2">
            No templates yet
          </h3>
          <p className="text-foreground0 max-w-md mx-auto mb-6">
            Create your first template by posting a job and clicking &quot;Save as Template&quot; to reuse it later.
          </p>
          <Link
            href="/organization/jobs/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Post Your First Job
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(template => (
            <div
              key={template.id}
              className="bg-card border border-card-border rounded-xl p-5 hover:border-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {template.name}
                  </h3>
                  {template.description && (
                    <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(template.id)}
                  disabled={deleting === template.id}
                  className="p-1.5 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                  title="Delete template"
                >
                  {deleting === template.id ? (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <TrashIcon className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Template Preview */}
              <div className="space-y-2 mb-4 text-sm">
                {template.title && (
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <BriefcaseIcon className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="truncate">{template.title}</span>
                  </div>
                )}
                {template.location && (
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <MapPinIcon className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="truncate">{template.location}</span>
                  </div>
                )}
                {template.employmentType && (
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <ClockIcon className="w-4 h-4 text-[var(--text-muted)]" />
                    <span>{template.employmentType}</span>
                  </div>
                )}
              </div>

              {/* Usage Stats */}
              {template.usageCount !== undefined && template.usageCount > 0 && (
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Used {template.usageCount} time{template.usageCount !== 1 ? 's' : ''}
                </p>
              )}

              {/* Actions */}
              <button
                onClick={() => handleCreateFromTemplate(template.id)}
                disabled={creating === template.id}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-lg font-medium hover:bg-accent/20 transition-colors disabled:opacity-50"
              >
                {creating === template.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <DocumentDuplicateIcon className="w-4 h-4" />
                    Use Template
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
