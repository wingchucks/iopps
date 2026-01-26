'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import {
  getSavedTalent,
  unsaveTalent,
  updateSavedTalent,
} from '@/lib/firestore/talentSearch';
import type { SavedTalent } from '@/lib/firestore/talentSearch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  BookmarkIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  EnvelopeIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  TagIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function SavedTalentPage() {
  const { user } = useAuth();
  const [savedTalent, setSavedTalent] = useState<SavedTalent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');

  useEffect(() => {
    async function loadSavedTalent() {
      if (!user) return;

      try {
        const talent = await getSavedTalent(user.uid);
        setSavedTalent(talent);
      } catch (error) {
        console.error('Error loading saved talent:', error);
        toast.error('Failed to load saved talent');
      } finally {
        setLoading(false);
      }
    }

    loadSavedTalent();
  }, [user]);

  const handleRemove = async (memberId: string, memberName: string) => {
    if (!user) return;

    try {
      await unsaveTalent(user.uid, memberId);
      setSavedTalent((prev) => prev.filter((t) => t.memberId !== memberId));
      toast.success(`${memberName} removed from talent pool`);
    } catch (error) {
      console.error('Error removing talent:', error);
      toast.error('Failed to remove from talent pool');
    }
  };

  const handleSaveNotes = async (savedId: string) => {
    try {
      await updateSavedTalent(savedId, { notes: notesValue });
      setSavedTalent((prev) =>
        prev.map((t) =>
          t.id === savedId ? { ...t, notes: notesValue } : t
        )
      );
      setEditingNotes(null);
      toast.success('Notes saved');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredTalent = savedTalent.filter((t) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.memberName?.toLowerCase().includes(query) ||
      t.notes?.toLowerCase().includes(query) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/organization/hire/talent"
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Saved Talent</h1>
            <p className="text-slate-400 mt-1">
              {savedTalent.length} professional{savedTalent.length !== 1 ? 's' : ''} in your talent pool
            </p>
          </div>
        </div>
        <Link
          href="/organization/hire/talent"
          className="flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          <MagnifyingGlassIcon className="w-4 h-4" />
          Find More Talent
        </Link>
      </div>

      {/* Search */}
      {savedTalent.length > 0 && (
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved talent by name or notes..."
            className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent/50"
          />
        </div>
      )}

      {/* Empty State */}
      {savedTalent.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <BookmarkIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">
            No saved talent yet
          </h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            Start building your talent pool by searching for Indigenous professionals and saving the ones you are interested in.
          </p>
          <Link
            href="/organization/hire/talent"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            <MagnifyingGlassIcon className="w-4 h-4" />
            Search Talent
          </Link>
        </div>
      ) : filteredTalent.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <MagnifyingGlassIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">
            No matching talent
          </h3>
          <p className="text-slate-500 max-w-md mx-auto">
            No saved talent matches your search. Try a different search term.
          </p>
        </div>
      ) : (
        /* Talent Grid */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTalent.map((talent) => (
            <div
              key={talent.id}
              className="bg-card border border-card-border rounded-2xl p-5 hover:border-slate-700 transition-all group"
            >
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 border-2 border-slate-800">
                  <AvatarImage src={talent.memberAvatar} />
                  <AvatarFallback className="bg-gradient-to-br from-accent to-teal-500 text-white">
                    {getInitials(talent.memberName)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-200 truncate">
                    {talent.memberName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Saved {talent.savedAt ? new Date(talent.savedAt.toDate()).toLocaleDateString() : 'recently'}
                  </p>
                </div>

                <button
                  onClick={() => handleRemove(talent.memberId, talent.memberName)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove from talent pool"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Notes */}
              <div className="mt-4">
                {editingNotes === talent.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Add notes about this candidate..."
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent/50 resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingNotes(null)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleSaveNotes(talent.id)}
                        className="p-1.5 rounded-lg text-accent hover:bg-accent/10 transition-colors"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingNotes(talent.id);
                      setNotesValue(talent.notes || '');
                    }}
                    className="w-full text-left px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-sm text-slate-400 hover:border-slate-700 transition-colors"
                  >
                    {talent.notes ? (
                      <span className="text-slate-300">{talent.notes}</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <PencilIcon className="w-3.5 h-3.5" />
                        Add notes...
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Tags */}
              {talent.tags && talent.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {talent.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400"
                    >
                      <TagIcon className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-2">
                <Link
                  href={`/member/${talent.memberId}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
                >
                  View Profile
                  <ChevronRightIcon className="w-4 h-4" />
                </Link>
                <Link
                  href={`/organization/messages?to=${talent.memberId}`}
                  className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-accent transition-colors"
                  title="Send message"
                >
                  <EnvelopeIcon className="w-5 h-5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
