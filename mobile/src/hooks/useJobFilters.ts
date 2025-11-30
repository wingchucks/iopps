import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RemoteWorkOption = 'remote' | 'hybrid' | 'on-site';
export type JobTypeOption = 'full-time' | 'part-time' | 'contract' | 'internship';
export type ExperienceLevelOption = 'entry' | 'mid' | 'senior' | 'executive';
export type PostedDateOption = '24h' | '7days' | '30days' | 'any';

export interface JobFilters {
  salaryMin?: number;
  salaryMax?: number;
  remoteWork: RemoteWorkOption[];
  jobTypes: JobTypeOption[];
  experienceLevel: ExperienceLevelOption[];
  postedDate: PostedDateOption;
  indigenousOwnedOnly: boolean;
  industries: string[];
}

export interface UseJobFiltersReturn {
  filters: JobFilters;
  setFilters: React.Dispatch<React.SetStateAction<JobFilters>>;
  applyFilters: (newFilters: JobFilters) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  isLoading: boolean;
}

const STORAGE_KEY = '@iopps_job_filters';

const DEFAULT_FILTERS: JobFilters = {
  salaryMin: undefined,
  salaryMax: undefined,
  remoteWork: [],
  jobTypes: [],
  experienceLevel: [],
  postedDate: 'any',
  indigenousOwnedOnly: false,
  industries: [],
};

/**
 * Custom hook for managing job filter state
 * - Persists filters to AsyncStorage
 * - Provides filter state management
 * - Calculates active filter count
 */
export function useJobFilters(): UseJobFiltersReturn {
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);

  // Load filters from AsyncStorage on mount
  useEffect(() => {
    loadFilters();
  }, []);

  // Load persisted filters
  const loadFilters = async () => {
    try {
      const storedFilters = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedFilters) {
        const parsed = JSON.parse(storedFilters);
        setFilters(parsed);
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save filters to AsyncStorage
  const saveFilters = async (newFilters: JobFilters) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newFilters));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
  };

  // Apply filters and persist
  const applyFilters = useCallback((newFilters: JobFilters) => {
    setFilters(newFilters);
    saveFilters(newFilters);
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    saveFilters(DEFAULT_FILTERS);
  }, []);

  // Calculate active filter count (excluding default values)
  const activeFilterCount = useCallback(() => {
    let count = 0;

    if (filters.salaryMin !== undefined || filters.salaryMax !== undefined) {
      count++;
    }
    if (filters.remoteWork.length > 0) {
      count++;
    }
    if (filters.jobTypes.length > 0) {
      count++;
    }
    if (filters.experienceLevel.length > 0) {
      count++;
    }
    if (filters.postedDate !== 'any') {
      count++;
    }
    if (filters.indigenousOwnedOnly) {
      count++;
    }
    if (filters.industries.length > 0) {
      count++;
    }

    return count;
  }, [filters])();

  return {
    filters,
    setFilters,
    applyFilters,
    clearFilters,
    activeFilterCount,
    isLoading,
  };
}

/**
 * Filter jobs based on filter criteria
 */
export function filterJobs(jobs: any[], filters: JobFilters): any[] {
  return jobs.filter((job) => {
    // Salary range filter
    if (filters.salaryMin !== undefined || filters.salaryMax !== undefined) {
      const jobSalary = extractSalaryFromRange(job.salaryRange);
      if (jobSalary) {
        if (filters.salaryMin !== undefined && jobSalary < filters.salaryMin) {
          return false;
        }
        if (filters.salaryMax !== undefined && jobSalary > filters.salaryMax) {
          return false;
        }
      }
    }

    // Remote work filter
    if (filters.remoteWork.length > 0) {
      const jobRemoteStatus = getRemoteWorkStatus(job);
      if (!filters.remoteWork.includes(jobRemoteStatus)) {
        return false;
      }
    }

    // Job type filter
    if (filters.jobTypes.length > 0) {
      const jobType = normalizeJobType(job.employmentType);
      if (!filters.jobTypes.includes(jobType)) {
        return false;
      }
    }

    // Experience level filter
    if (filters.experienceLevel.length > 0) {
      const experienceLevel = extractExperienceLevel(job);
      if (experienceLevel && !filters.experienceLevel.includes(experienceLevel)) {
        return false;
      }
    }

    // Posted date filter
    if (filters.postedDate !== 'any') {
      const jobDate = job.createdAt?.toDate?.() || new Date(job.createdAt);
      const now = new Date();
      const hoursDiff = (now.getTime() - jobDate.getTime()) / (1000 * 60 * 60);

      switch (filters.postedDate) {
        case '24h':
          if (hoursDiff > 24) return false;
          break;
        case '7days':
          if (hoursDiff > 24 * 7) return false;
          break;
        case '30days':
          if (hoursDiff > 24 * 30) return false;
          break;
      }
    }

    // Indigenous-owned filter
    if (filters.indigenousOwnedOnly && !job.indigenousOwned) {
      return false;
    }

    // Industry filter
    if (filters.industries.length > 0) {
      const jobIndustry = job.category || job.industry;
      if (!jobIndustry || !filters.industries.includes(jobIndustry)) {
        return false;
      }
    }

    return true;
  });
}

// Helper functions
function extractSalaryFromRange(salaryRange?: string): number | null {
  if (!salaryRange) return null;

  // Extract numbers from salary range string (e.g., "$50,000 - $70,000")
  const numbers = salaryRange.match(/\d+/g);
  if (!numbers || numbers.length === 0) return null;

  // Use the average of min and max if both present, otherwise use the single value
  if (numbers.length >= 2) {
    const min = parseInt(numbers[0]);
    const max = parseInt(numbers[1]);
    return (min + max) / 2;
  }

  return parseInt(numbers[0]);
}

function getRemoteWorkStatus(job: any): RemoteWorkOption {
  if (job.remoteFlag === true || job.location?.toLowerCase().includes('remote')) {
    return 'remote';
  }
  if (job.location?.toLowerCase().includes('hybrid')) {
    return 'hybrid';
  }
  return 'on-site';
}

function normalizeJobType(employmentType?: string): JobTypeOption {
  if (!employmentType) return 'full-time';

  const type = employmentType.toLowerCase();
  if (type.includes('part')) return 'part-time';
  if (type.includes('contract')) return 'contract';
  if (type.includes('intern')) return 'internship';
  return 'full-time';
}

function extractExperienceLevel(job: any): ExperienceLevelOption | null {
  const title = (job.title || '').toLowerCase();
  const description = (job.description || '').toLowerCase();
  const text = `${title} ${description}`;

  if (text.includes('senior') || text.includes('sr.')) return 'senior';
  if (text.includes('executive') || text.includes('director') || text.includes('vp')) return 'executive';
  if (text.includes('junior') || text.includes('jr.') || text.includes('entry')) return 'entry';
  if (text.includes('mid-level') || text.includes('intermediate')) return 'mid';

  return null;
}
