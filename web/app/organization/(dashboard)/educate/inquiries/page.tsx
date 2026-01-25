'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { listSchoolInquiries, getSchoolByEmployerId } from '@/lib/firestore';
import type { StudentInquiry as BaseStudentInquiry } from '@/lib/types';

// Extended type for display purposes
type DisplayInquiry = BaseStudentInquiry & {
  displayType: 'program' | 'scholarship' | 'general';
  displayName?: string;
  displayEmail?: string;
  relatedEntityTitle?: string;
  isRead: boolean;
};
import {
  ChatBubbleLeftRightIcon,
  UserIcon,
  EnvelopeIcon,
  BookOpenIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

export default function EducateInquiriesPage() {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState<DisplayInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'programs' | 'scholarships' | 'general'>('all');

  useEffect(() => {
    async function loadInquiries() {
      if (!user) return;

      try {
        // Get school first, then its inquiries
        const school = await getSchoolByEmployerId(user.uid);
        if (school) {
          const rawInquiries = await listSchoolInquiries(school.id);
          // Map to DisplayInquiry shape
          const mappedInquiries: DisplayInquiry[] = rawInquiries.map(inq => ({
            ...inq,
            displayType: inq.programId ? 'program' : 'general',
            displayName: inq.studentName || inq.memberName,
            displayEmail: inq.studentEmail || inq.memberEmail,
            relatedEntityTitle: inq.subject,
            isRead: inq.status !== 'new',
          }));
          setInquiries(mappedInquiries);
        }
      } catch (error) {
        console.error('Error loading inquiries:', error);
      } finally {
        setLoading(false);
      }
    }

    loadInquiries();
  }, [user]);

  const filteredInquiries = inquiries.filter(inquiry => {
    if (filter === 'programs') return inquiry.displayType === 'program';
    if (filter === 'scholarships') return inquiry.displayType === 'scholarship';
    if (filter === 'general') return inquiry.displayType === 'general';
    return true;
  });

  const programCount = inquiries.filter(i => i.displayType === 'program').length;
  const scholarshipCount = inquiries.filter(i => i.displayType === 'scholarship').length;
  const generalCount = inquiries.filter(i => i.displayType === 'general').length;
  const unreadCount = inquiries.filter(i => !i.isRead).length;

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
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Student Inquiries</h1>
        <p className="text-slate-400 mt-1">
          Messages from prospective students
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded bg-accent/20 text-accent">
              {unreadCount} unread
            </span>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'all'
              ? 'bg-accent/10 text-accent border border-accent/20'
              : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700'
          }`}
        >
          All ({inquiries.length})
        </button>
        <button
          onClick={() => setFilter('programs')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'programs'
              ? 'bg-blue-900/30 text-blue-400 border border-blue-800/30'
              : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700'
          }`}
        >
          <BookOpenIcon className="w-3.5 h-3.5" />
          Programs ({programCount})
        </button>
        <button
          onClick={() => setFilter('scholarships')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'scholarships'
              ? 'bg-purple-900/30 text-purple-400 border border-purple-800/30'
              : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700'
          }`}
        >
          <AcademicCapIcon className="w-3.5 h-3.5" />
          Scholarships ({scholarshipCount})
        </button>
        <button
          onClick={() => setFilter('general')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'general'
              ? 'bg-slate-700/50 text-slate-300 border border-slate-600'
              : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700'
          }`}
        >
          General ({generalCount})
        </button>
      </div>

      {/* Inquiries List */}
      {filteredInquiries.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <ChatBubbleLeftRightIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">
            {filter === 'all' ? 'No inquiries yet' : `No ${filter} inquiries`}
          </h3>
          <p className="text-slate-500 max-w-md mx-auto">
            {filter === 'all'
              ? 'When students contact you about programs or scholarships, their messages will appear here.'
              : 'No inquiries match this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInquiries.map(inquiry => (
            <Link
              key={inquiry.id}
              href={`/organization/educate/inquiries/${inquiry.id}`}
              className={`block bg-card border rounded-xl p-4 transition-colors ${
                inquiry.isRead
                  ? 'border-card-border hover:border-slate-700'
                  : 'border-accent/30 bg-accent/5 hover:border-accent/50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-200">
                        {inquiry.displayName || 'Anonymous Student'}
                      </p>
                      {!inquiry.isRead && (
                        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-accent/20 text-accent">
                          New
                        </span>
                      )}
                    </div>
                    {inquiry.relatedEntityTitle && (
                      <p className="text-sm text-slate-400">
                        Re: {inquiry.relatedEntityTitle}
                      </p>
                    )}
                    <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                      {inquiry.message}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                        inquiry.displayType === 'program'
                          ? 'bg-blue-900/30 text-blue-400'
                          : inquiry.displayType === 'scholarship'
                          ? 'bg-purple-900/30 text-purple-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {inquiry.displayType === 'program' && <BookOpenIcon className="w-3 h-3" />}
                        {inquiry.displayType === 'scholarship' && <AcademicCapIcon className="w-3 h-3" />}
                        {inquiry.displayType.charAt(0).toUpperCase() + inquiry.displayType.slice(1)}
                      </span>
                      {inquiry.displayEmail && (
                        <span className="flex items-center gap-1">
                          <EnvelopeIcon className="w-3.5 h-3.5" />
                          {inquiry.displayEmail}
                        </span>
                      )}
                      <span>
                        {inquiry.createdAt
                          ? formatDistanceToNow(
                              inquiry.createdAt instanceof Date
                                ? inquiry.createdAt
                                : inquiry.createdAt.toDate(),
                              { addSuffix: true }
                            )
                          : 'recently'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
