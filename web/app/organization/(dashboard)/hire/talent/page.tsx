'use client';

import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  MapPinIcon,
  AcademicCapIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';

export default function HireTalentPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    location: '',
    skills: '',
    experience: '',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Talent Search</h1>
        <p className="text-slate-400 mt-1">
          Search for Indigenous talent across the community
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, skills, or keywords..."
            className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent/50"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.location}
          onChange={e => setFilters({ ...filters, location: e.target.value })}
          className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-accent/50"
        >
          <option value="">All Locations</option>
          <option value="remote">Remote</option>
          <option value="ontario">Ontario</option>
          <option value="bc">British Columbia</option>
          <option value="alberta">Alberta</option>
          <option value="manitoba">Manitoba</option>
          <option value="saskatchewan">Saskatchewan</option>
        </select>

        <select
          value={filters.experience}
          onChange={e => setFilters({ ...filters, experience: e.target.value })}
          className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-accent/50"
        >
          <option value="">Any Experience</option>
          <option value="entry">Entry Level</option>
          <option value="mid">Mid Level (2-5 years)</option>
          <option value="senior">Senior (5+ years)</option>
        </select>
      </div>

      {/* Coming Soon State */}
      <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
        <UserGroupIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-300 mb-2">
          Talent Search Coming Soon
        </h3>
        <p className="text-slate-500 max-w-md mx-auto mb-6">
          Soon you will be able to search and connect with Indigenous talent who have public profiles on IOPPS.
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <MapPinIcon className="w-4 h-4" />
            Search by location
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <AcademicCapIcon className="w-4 h-4" />
            Filter by skills
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <BriefcaseIcon className="w-4 h-4" />
            Browse by industry
          </div>
        </div>
      </div>
    </div>
  );
}
