'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import {
  searchTalent,
  saveTalent,
  unsaveTalent,
  isTalentSaved,
  getPopularSkills,
  trackTalentView,
} from '@/lib/firestore/talentSearch';
import type { TalentSearchFilters, TalentSearchResult } from '@/lib/firestore/talentSearch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  MapPinIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  BookmarkIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  SparklesIcon,
  FunnelIcon,
  XMarkIcon,
  CheckIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

export default function HireTalentPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TalentSearchFilters>({
    location: '',
    skills: [],
    experience: '',
    availability: '',
  });
  const [results, setResults] = useState<TalentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [popularSkills, setPopularSkills] = useState<{ skill: string; count: number }[]>([]);
  const [savedMembers, setSavedMembers] = useState<Set<string>>(new Set());
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Load popular skills on mount
  useEffect(() => {
    getPopularSkills(15).then(setPopularSkills);
  }, []);

  // Perform search
  const performSearch = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const searchFilters: TalentSearchFilters = {
        ...filters,
        query: searchQuery || undefined,
        skills: selectedSkills.length > 0 ? selectedSkills : undefined,
      };

      const { results: searchResults, hasMore: more } = await searchTalent({
        filters: searchFilters,
        limit: 20,
      });

      setResults(searchResults);
      setHasMore(more);

      // Check saved status for all results
      const savedStatus = new Set<string>();
      for (const result of searchResults) {
        const saved = await isTalentSaved(user.uid, result.member.id);
        if (saved) savedStatus.add(result.member.id);
      }
      setSavedMembers(savedStatus);
    } catch (error) {
      console.error('Error searching talent:', error);
      toast.error('Failed to search talent');
    } finally {
      setLoading(false);
    }
  }, [user, searchQuery, filters, selectedSkills]);

  // Search on filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [performSearch]);

  const handleToggleSave = async (memberId: string, memberName: string, avatar?: string) => {
    if (!user) return;

    try {
      if (savedMembers.has(memberId)) {
        await unsaveTalent(user.uid, memberId);
        setSavedMembers((prev) => {
          const next = new Set(prev);
          next.delete(memberId);
          return next;
        });
        toast.success('Removed from talent pool');
      } else {
        await saveTalent(user.uid, memberId, memberName, avatar);
        setSavedMembers((prev) => new Set(prev).add(memberId));
        toast.success('Added to talent pool');
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      toast.error('Failed to update talent pool');
    }
  };

  const handleViewProfile = async (memberId: string) => {
    if (!user) return;
    await trackTalentView(user.uid, memberId);
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill]
    );
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

  const getExperienceLabel = (experienceCount?: number) => {
    if (!experienceCount || experienceCount <= 1) return 'Entry Level';
    if (experienceCount <= 3) return 'Mid Level';
    return 'Senior';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Talent Search</h1>
          <p className="text-slate-400 mt-1">
            Discover Indigenous professionals for your team
          </p>
        </div>
        <Link
          href="/organization/hire/talent/saved"
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
        >
          <BookmarkSolidIcon className="w-4 h-4 text-accent" />
          Saved Talent
        </Link>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, skills, or keywords..."
            className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent/50"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-colors ${
            showFilters
              ? 'bg-accent/10 border-accent/30 text-accent'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <FunnelIcon className="w-5 h-5" />
          Filters
          {(filters.location || filters.experience || filters.availability || selectedSkills.length > 0) && (
            <span className="w-2 h-2 rounded-full bg-accent" />
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
          {/* Location & Experience */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Location</label>
              <select
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-accent/50"
              >
                <option value="">All Locations</option>
                <option value="remote">Open to Remote</option>
                <option value="ontario">Ontario</option>
                <option value="british columbia">British Columbia</option>
                <option value="alberta">Alberta</option>
                <option value="manitoba">Manitoba</option>
                <option value="saskatchewan">Saskatchewan</option>
                <option value="quebec">Quebec</option>
                <option value="nova scotia">Nova Scotia</option>
                <option value="new brunswick">New Brunswick</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Experience Level</label>
              <select
                value={filters.experience}
                onChange={(e) => setFilters({ ...filters, experience: e.target.value as TalentSearchFilters['experience'] })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-accent/50"
              >
                <option value="">Any Experience</option>
                <option value="entry">Entry Level (0-2 years)</option>
                <option value="mid">Mid Level (2-5 years)</option>
                <option value="senior">Senior (5+ years)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Availability</label>
              <select
                value={filters.availability}
                onChange={(e) => setFilters({ ...filters, availability: e.target.value as TalentSearchFilters['availability'] })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-accent/50"
              >
                <option value="">Open to Opportunities</option>
                <option value="yes">Actively Looking</option>
                <option value="maybe">Open to Offers</option>
              </select>
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Popular Skills {selectedSkills.length > 0 && `(${selectedSkills.length} selected)`}
            </label>
            <div className="flex flex-wrap gap-2">
              {popularSkills.map(({ skill }) => (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                    selectedSkills.includes(skill)
                      ? 'bg-accent text-slate-950 font-medium'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {skill}
                  {selectedSkills.includes(skill) && <CheckIcon className="w-3 h-3 inline ml-1" />}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {(filters.location || filters.experience || filters.availability || selectedSkills.length > 0) && (
            <button
              onClick={() => {
                setFilters({ location: '', experience: '', availability: '' });
                setSelectedSkills([]);
              }}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
            >
              <XMarkIcon className="w-4 h-4" />
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <UserGroupIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">
            {searchQuery || selectedSkills.length > 0 ? 'No matching talent found' : 'Start Your Search'}
          </h3>
          <p className="text-slate-500 max-w-md mx-auto">
            {searchQuery || selectedSkills.length > 0
              ? 'Try adjusting your filters or search terms to find more candidates.'
              : 'Use the search bar and filters above to find Indigenous professionals who match your hiring needs.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Found {results.length} professional{results.length !== 1 ? 's' : ''}
            {hasMore && '+'}
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {results.map(({ member, matchScore, matchReasons }) => (
              <div
                key={member.id}
                className="bg-card border border-card-border rounded-2xl p-5 hover:border-slate-700 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14 border-2 border-slate-800">
                    <AvatarImage src={member.avatarUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-accent to-teal-500 text-white">
                      {getInitials(member.displayName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-200 truncate">
                        {member.displayName}
                      </h3>
                      {matchScore && matchScore >= 70 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs">
                          <SparklesIcon className="w-3 h-3" />
                          Top Match
                        </span>
                      )}
                    </div>

                    {member.tagline && (
                      <p className="text-sm text-slate-400 truncate">{member.tagline}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                      {member.location && (
                        <span className="flex items-center gap-1">
                          <MapPinIcon className="w-3.5 h-3.5" />
                          {member.location}
                        </span>
                      )}
                      {member.experience && member.experience.length > 0 && (
                        <span className="flex items-center gap-1">
                          <BriefcaseIcon className="w-3.5 h-3.5" />
                          {getExperienceLabel(member.experience.length)}
                        </span>
                      )}
                      {member.resumeUrl && (
                        <span className="flex items-center gap-1 text-accent">
                          <DocumentTextIcon className="w-3.5 h-3.5" />
                          Resume
                        </span>
                      )}
                    </div>

                    {/* Indigenous Affiliation */}
                    {member.indigenousAffiliation && (
                      <p className="mt-2 text-xs text-emerald-400">
                        {member.indigenousAffiliation}
                      </p>
                    )}
                  </div>
                </div>

                {/* Skills */}
                {member.skills && member.skills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {member.skills.slice(0, 5).map((skill) => (
                      <span
                        key={skill}
                        className={`px-2 py-0.5 rounded text-xs ${
                          selectedSkills.includes(skill.toLowerCase())
                            ? 'bg-accent/20 text-accent'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {skill}
                      </span>
                    ))}
                    {member.skills.length > 5 && (
                      <span className="px-2 py-0.5 text-xs text-slate-500">
                        +{member.skills.length - 5} more
                      </span>
                    )}
                  </div>
                )}

                {/* Match reasons */}
                {matchReasons && matchReasons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {matchReasons.slice(0, 2).map((reason, i) => (
                      <span key={i} className="text-xs text-slate-500">
                        {i > 0 && '•'} {reason}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-2">
                  <Link
                    href={`/member/${member.id}`}
                    onClick={() => handleViewProfile(member.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
                  >
                    View Profile
                    <ChevronRightIcon className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleToggleSave(member.id, member.displayName || '', member.avatarUrl)}
                    className={`p-2 rounded-lg transition-colors ${
                      savedMembers.has(member.id)
                        ? 'bg-accent/10 text-accent'
                        : 'bg-slate-800 text-slate-400 hover:text-accent'
                    }`}
                    title={savedMembers.has(member.id) ? 'Remove from saved' : 'Save to talent pool'}
                  >
                    {savedMembers.has(member.id) ? (
                      <BookmarkSolidIcon className="w-5 h-5" />
                    ) : (
                      <BookmarkIcon className="w-5 h-5" />
                    )}
                  </button>
                  <Link
                    href={`/organization/messages?to=${member.id}`}
                    className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-accent transition-colors"
                    title="Send message"
                  >
                    <EnvelopeIcon className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={performSearch}
                className="px-6 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
