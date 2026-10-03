import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getFromCache,
  saveToCache,
  removeFromCache,
  removeFromCacheByPrefix,
  clearCache,
  CACHE_KEYS,
  CACHE_TTL,
  LEGACY_CONVERSATIONS_CACHE_PREFIX,
} from '../lib/cache';

describe('Cache utilities', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('saveToCache', () => {
    it('should save data to cache', async () => {
      const testData = { id: 1, name: 'Test Job' };
      await saveToCache('test-key', testData);

      const stored = await AsyncStorage.getItem('@iopps:test-key');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.data).toEqual(testData);
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.ttl).toBeDefined();
    });

    it('should save with custom TTL', async () => {
      const testData = { test: true };
      const customTTL = 60000;
      await saveToCache('test-key', testData, customTTL);

      const stored = await AsyncStorage.getItem('@iopps:test-key');
      const parsed = JSON.parse(stored!);
      expect(parsed.ttl).toBe(customTTL);
    });
  });

  describe('getFromCache', () => {
    it('should return null for non-existent key', async () => {
      const result = await getFromCache('non-existent');
      expect(result).toBeNull();
    });

    it('should return cached data', async () => {
      const testData = { id: 1, name: 'Test' };
      await saveToCache('test-key', testData);

      const result = await getFromCache('test-key');
      expect(result).toEqual(testData);
    });

    it('should return null for expired cache', async () => {
      // Save with very short TTL
      const entry = {
        data: { test: true },
        timestamp: Date.now() - 10000, // 10 seconds ago
        ttl: 5000, // 5 second TTL (already expired)
      };
      await AsyncStorage.setItem('@iopps:expired-key', JSON.stringify(entry));

      const result = await getFromCache('expired-key');
      expect(result).toBeNull();
    });
  });

  describe('removeFromCache', () => {
    it('should remove item from cache', async () => {
      await saveToCache('to-remove', { data: true });
      await removeFromCache('to-remove');

      const result = await getFromCache('to-remove');
      expect(result).toBeNull();
    });
  });

  describe('removeFromCacheByPrefix', () => {
    it('removes legacy message previews for every account and nothing else', async () => {
      await saveToCache('conversations:user-a', [{ lastMessage: 'Private to A' }]);
      await saveToCache('conversations:user-b', [{ lastMessage: 'Private to B' }]);
      await saveToCache(CACHE_KEYS.SAVED_JOBS('user-a'), ['job-1']);
      await AsyncStorage.setItem('conversations:not-ours', 'kept');

      await removeFromCacheByPrefix(LEGACY_CONVERSATIONS_CACHE_PREFIX);

      expect(await getFromCache('conversations:user-a')).toBeNull();
      expect(await getFromCache('conversations:user-b')).toBeNull();
      expect(await getFromCache(CACHE_KEYS.SAVED_JOBS('user-a'))).toEqual(['job-1']);
      expect(await AsyncStorage.getItem('conversations:not-ours')).toBe('kept');
    });
  });

  describe('CACHE_KEYS', () => {
    it('should have correct key formats', () => {
      // Bumped when the cached job shape changed, so old entries are never read.
      expect(CACHE_KEYS.JOBS).toBe('jobs:v2');
      expect(CACHE_KEYS.JOB_DETAIL('123')).toBe('job:123');
      expect(CACHE_KEYS.USER_PROFILE('user-1')).toBe('user:user-1');
      expect(CACHE_KEYS.SAVED_JOBS('user-1')).toBe('savedJobs:user-1');
    });
  });

  describe('CACHE_TTL', () => {
    it('should have correct TTL values', () => {
      expect(CACHE_TTL.SHORT).toBe(60000); // 1 minute
      expect(CACHE_TTL.MEDIUM).toBe(300000); // 5 minutes
      expect(CACHE_TTL.LONG).toBe(900000); // 15 minutes
      expect(CACHE_TTL.VERY_LONG).toBe(3600000); // 1 hour
    });
  });
});
