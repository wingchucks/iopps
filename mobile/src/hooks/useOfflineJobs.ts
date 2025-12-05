import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JobPosting } from '../types';
import { useNetwork } from '../context/NetworkContext';
import { logger } from '../lib/logger';

const OFFLINE_JOBS_KEY = '@iopps:offline_jobs';
const OFFLINE_JOBS_TIMESTAMP = '@iopps:offline_jobs_timestamp';
const MAX_OFFLINE_JOBS = 50;
const OFFLINE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface UseOfflineJobsResult {
  offlineJobs: JobPosting[];
  isOfflineMode: boolean;
  saveJobsForOffline: (jobs: JobPosting[]) => Promise<void>;
  getOfflineJob: (jobId: string) => JobPosting | null;
  clearOfflineJobs: () => Promise<void>;
  lastSyncTime: Date | null;
  isStale: boolean;
}

/**
 * Hook for managing offline job data
 * Automatically caches jobs for offline viewing
 */
export function useOfflineJobs(): UseOfflineJobsResult {
  const { isConnected } = useNetwork();
  const [offlineJobs, setOfflineJobs] = useState<JobPosting[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);

  // Load offline jobs on mount
  useEffect(() => {
    loadOfflineJobs();
  }, []);

  // Check if cache is stale
  useEffect(() => {
    if (lastSyncTime) {
      const now = Date.now();
      const cacheAge = now - lastSyncTime.getTime();
      setIsStale(cacheAge > OFFLINE_CACHE_DURATION);
    }
  }, [lastSyncTime]);

  const loadOfflineJobs = async () => {
    try {
      const [jobsJson, timestampStr] = await AsyncStorage.multiGet([
        OFFLINE_JOBS_KEY,
        OFFLINE_JOBS_TIMESTAMP,
      ]);

      if (jobsJson[1]) {
        const jobs = JSON.parse(jobsJson[1]);
        setOfflineJobs(jobs);
      }

      if (timestampStr[1]) {
        setLastSyncTime(new Date(parseInt(timestampStr[1], 10)));
      }
    } catch (error) {
      logger.error('Error loading offline jobs:', error);
    }
  };

  const saveJobsForOffline = useCallback(async (jobs: JobPosting[]) => {
    try {
      // Only save the most recent jobs to limit storage
      const jobsToSave = jobs.slice(0, MAX_OFFLINE_JOBS);
      const timestamp = Date.now().toString();

      await AsyncStorage.multiSet([
        [OFFLINE_JOBS_KEY, JSON.stringify(jobsToSave)],
        [OFFLINE_JOBS_TIMESTAMP, timestamp],
      ]);

      setOfflineJobs(jobsToSave);
      setLastSyncTime(new Date(parseInt(timestamp, 10)));
      setIsStale(false);
    } catch (error) {
      logger.error('Error saving offline jobs:', error);
    }
  }, []);

  const getOfflineJob = useCallback((jobId: string): JobPosting | null => {
    return offlineJobs.find(job => job.id === jobId) || null;
  }, [offlineJobs]);

  const clearOfflineJobs = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([OFFLINE_JOBS_KEY, OFFLINE_JOBS_TIMESTAMP]);
      setOfflineJobs([]);
      setLastSyncTime(null);
      setIsStale(false);
    } catch (error) {
      logger.error('Error clearing offline jobs:', error);
    }
  }, []);

  return {
    offlineJobs,
    isOfflineMode: !isConnected,
    saveJobsForOffline,
    getOfflineJob,
    clearOfflineJobs,
    lastSyncTime,
    isStale,
  };
}

/**
 * Hook for offline-first job detail fetching
 */
export function useOfflineJobDetail(jobId: string) {
  const { getOfflineJob, isOfflineMode } = useOfflineJobs();
  const [job, setJob] = useState<JobPosting | null>(null);

  useEffect(() => {
    if (isOfflineMode) {
      const offlineJob = getOfflineJob(jobId);
      setJob(offlineJob);
    }
  }, [jobId, isOfflineMode, getOfflineJob]);

  return {
    offlineJob: job,
    isOfflineMode,
  };
}

/**
 * Hook for managing saved jobs offline
 */
const OFFLINE_SAVED_JOBS_KEY = '@iopps:offline_saved_jobs';

interface SavedJobsOfflineState {
  savedJobIds: string[];
  pendingSaves: string[];
  pendingRemoves: string[];
}

export function useOfflineSavedJobs() {
  const { isConnected } = useNetwork();
  const [state, setState] = useState<SavedJobsOfflineState>({
    savedJobIds: [],
    pendingSaves: [],
    pendingRemoves: [],
  });

  // Load saved state on mount
  useEffect(() => {
    loadSavedState();
  }, []);

  // Sync pending changes when back online
  useEffect(() => {
    if (isConnected && (state.pendingSaves.length > 0 || state.pendingRemoves.length > 0)) {
      syncPendingChanges();
    }
  }, [isConnected]);

  const loadSavedState = async () => {
    try {
      const savedState = await AsyncStorage.getItem(OFFLINE_SAVED_JOBS_KEY);
      if (savedState) {
        setState(JSON.parse(savedState));
      }
    } catch (error) {
      logger.error('Error loading saved jobs state:', error);
    }
  };

  const saveSavedState = async (newState: SavedJobsOfflineState) => {
    try {
      await AsyncStorage.setItem(OFFLINE_SAVED_JOBS_KEY, JSON.stringify(newState));
      setState(newState);
    } catch (error) {
      logger.error('Error saving saved jobs state:', error);
    }
  };

  const toggleSaveJob = useCallback(async (jobId: string, save: boolean) => {
    const newState = { ...state };

    if (save) {
      if (!newState.savedJobIds.includes(jobId)) {
        newState.savedJobIds.push(jobId);
      }
      if (!isConnected) {
        newState.pendingSaves.push(jobId);
        // Remove from pending removes if it was there
        newState.pendingRemoves = newState.pendingRemoves.filter(id => id !== jobId);
      }
    } else {
      newState.savedJobIds = newState.savedJobIds.filter(id => id !== jobId);
      if (!isConnected) {
        newState.pendingRemoves.push(jobId);
        // Remove from pending saves if it was there
        newState.pendingSaves = newState.pendingSaves.filter(id => id !== jobId);
      }
    }

    await saveSavedState(newState);
  }, [state, isConnected]);

  const syncPendingChanges = useCallback(async () => {
    // This would sync with Firestore when back online
    // Implementation depends on your Firestore save/unsave functions
    logger.log('Syncing pending changes:', state.pendingSaves, state.pendingRemoves);

    // Clear pending after sync
    const newState = {
      ...state,
      pendingSaves: [],
      pendingRemoves: [],
    };
    await saveSavedState(newState);
  }, [state]);

  const isJobSaved = useCallback((jobId: string): boolean => {
    return state.savedJobIds.includes(jobId);
  }, [state.savedJobIds]);

  return {
    savedJobIds: state.savedJobIds,
    toggleSaveJob,
    isJobSaved,
    hasPendingChanges: state.pendingSaves.length > 0 || state.pendingRemoves.length > 0,
  };
}
