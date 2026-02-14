/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getAuth,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
  type Auth,
  type User,
  type UserCredential,
} from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';

type PersistenceMode = 'indexedDB' | 'localStorage' | 'memory' | 'unknown';

let currentPersistenceMode: PersistenceMode = 'unknown';
let idbHealthy: boolean | null = null;

/**
 * Tests whether IndexedDB is functional with a 3-second timeout.
 * Some browsers (private mode, corrupted state) silently fail IDB operations.
 */
export async function checkIDBHealth(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    idbHealthy = false;
    return false;
  }

  try {
    const result = await Promise.race([
      new Promise<boolean>((resolve) => {
        try {
          const testName = '__firebase_auth_idb_test__';
          const req = window.indexedDB.open(testName, 1);

          req.onerror = () => resolve(false);
          req.onsuccess = () => {
            try {
              req.result.close();
              window.indexedDB.deleteDatabase(testName);
              resolve(true);
            } catch {
              resolve(false);
            }
          };
          req.onblocked = () => resolve(false);
        } catch {
          resolve(false);
        }
      }),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000)),
    ]);

    idbHealthy = result;
    return result;
  } catch {
    idbHealthy = false;
    return false;
  }
}

/**
 * Deletes all Firebase-related IndexedDB databases for recovery.
 * Used when IDB is in a corrupted state causing auth failures.
 */
export async function clearFirebaseIDB(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.indexedDB) return false;

  const firebaseDBNames = [
    'firebaseLocalStorageDb',
    'firebase-heartbeat-database',
    'firebase-installations-database',
    'firebase-messaging-database',
  ];

  try {
    const deletions = firebaseDBNames.map(
      (name) =>
        new Promise<void>((resolve) => {
          try {
            const req = window.indexedDB.deleteDatabase(name);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
          } catch {
            resolve();
          }
        })
    );

    await Promise.all(deletions);
    idbHealthy = null; // Reset so next check re-evaluates
    currentPersistenceMode = 'unknown';
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a Firebase Auth instance with automatic IDB fallback.
 * If IndexedDB is unhealthy, falls back to localStorage, then memory persistence.
 */
export async function getOrCreateResilientAuth(app: FirebaseApp): Promise<Auth> {
  const auth = getAuth(app);

  const healthy = await checkIDBHealth();

  if (healthy) {
    try {
      await setPersistence(auth, indexedDBLocalPersistence);
      currentPersistenceMode = 'indexedDB';
      return auth;
    } catch {
      // IDB persistence failed, fall through to localStorage
    }
  }

  // Fallback: try localStorage
  try {
    await setPersistence(auth, browserLocalPersistence);
    currentPersistenceMode = 'localStorage';
    console.warn('[firebase-auth-resilient] Using localStorage persistence (IDB unavailable)');
    return auth;
  } catch {
    // localStorage also failed, fall through to memory
  }

  // Last resort: in-memory persistence
  try {
    await setPersistence(auth, inMemoryPersistence);
    currentPersistenceMode = 'memory';
    console.warn('[firebase-auth-resilient] Using in-memory persistence (IDB + localStorage unavailable)');
  } catch {
    currentPersistenceMode = 'unknown';
    console.error('[firebase-auth-resilient] All persistence modes failed');
  }

  return auth;
}

/**
 * Sign in with email/password with automatic retry on network errors.
 * On network failure, waits briefly and retries once before throwing.
 */
export async function resilientSignIn(
  auth: Auth,
  email: string,
  password: string
): Promise<UserCredential> {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    if (error?.code === 'auth/network-request-failed') {
      // Wait 1.5s and retry once
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return await signInWithEmailAndPassword(auth, email, password);
    }
    throw error;
  }
}

/**
 * Google sign-in with IDB recovery.
 * If sign-in fails due to IDB issues, clears Firebase IDB and retries.
 */
export async function resilientSignInWithGoogle(
  auth: Auth,
  provider: any
): Promise<UserCredential> {
  try {
    return await signInWithPopup(auth, provider);
  } catch (error: any) {
    const isIDBError =
      error?.code === 'auth/internal-error' ||
      error?.code === 'auth/network-request-failed' ||
      error?.message?.includes('IndexedDB');

    if (isIDBError) {
      console.warn('[firebase-auth-resilient] Sign-in failed, attempting IDB recovery');
      await clearFirebaseIDB();

      // Re-set persistence after clearing IDB
      try {
        await setPersistence(auth, browserLocalPersistence);
        currentPersistenceMode = 'localStorage';
      } catch {
        // Continue with whatever persistence is available
      }

      return await signInWithPopup(auth, provider);
    }
    throw error;
  }
}

/**
 * Auth state listener with a configurable timeout.
 * Resolves with the user (or null) if onAuthStateChanged fires,
 * or calls onTimeout if the listener doesn't fire within the timeout period.
 */
export function onAuthStateChangedWithTimeout(
  auth: Auth,
  callback: (user: User | null) => void,
  options: { timeoutMs?: number; onTimeout?: () => void } = {}
): () => void {
  const { timeoutMs = 10000, onTimeout } = options;
  let settled = false;

  const timer = setTimeout(() => {
    if (!settled) {
      settled = true;
      console.warn(`[firebase-auth-resilient] Auth state timed out after ${timeoutMs}ms`);
      onTimeout?.();
      callback(null);
    }
  }, timeoutMs);

  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (!settled) {
      settled = true;
      clearTimeout(timer);
      callback(user);
    }
  });

  return () => {
    settled = true;
    clearTimeout(timer);
    unsubscribe();
  };
}

/** Returns the current persistence mode being used. */
export function getPersistenceMode(): PersistenceMode {
  return currentPersistenceMode;
}

/** Returns whether IndexedDB is healthy (null if not yet checked). */
export function isIDBHealthy(): boolean | null {
  return idbHealthy;
}
