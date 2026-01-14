import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { auth } from "../lib/firebase";
import {
  registerForPushNotificationsAsync,
  savePushToken,
  removePushToken,
} from "../lib/notifications";
import { authLogger } from "../lib/logger";
import * as WebBrowser from "expo-web-browser";
import {
  AccountState,
  resolveAccountState,
  canAccessEmployerDashboard,
  isEmployerPending,
  isEmployerApproved,
} from "../services/accountState";
import type { EmployerProfile, UserProfile } from "../types";

// Required for web browser auth sessions to complete properly
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  expoPushToken: string | null;
  // New account state fields
  accountState: AccountState;
  userProfile: UserProfile | null;
  employerProfile: EmployerProfile | null;
  // Helper functions
  canAccessEmployerDashboard: boolean;
  isEmployerPending: boolean;
  isEmployerApproved: boolean;
  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  registerPushNotifications: () => Promise<boolean>;
  refreshAccountState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  expoPushToken: null,
  // New defaults
  accountState: AccountState.COMMUNITY,
  userProfile: null,
  employerProfile: null,
  canAccessEmployerDashboard: false,
  isEmployerPending: false,
  isEmployerApproved: false,
  // Actions
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  registerPushNotifications: async () => false,
  refreshAccountState: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  // New account state fields
  const [accountState, setAccountState] = useState<AccountState>(AccountState.COMMUNITY);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);

  const previousUserId = useRef<string | null>(null);

  // Register push notifications for a user
  const registerPushNotifications = async (): Promise<boolean> => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        setExpoPushToken(token);
        if (user) {
          await savePushToken(user.uid, token);
        }
        return true;
      }
      return false;
    } catch (error) {
      authLogger.error("Error registering push notifications", error);
      return false;
    }
  };

  // Fetch and resolve account state
  const fetchAccountState = useCallback(async (uid: string) => {
    try {
      const result = await resolveAccountState(uid);
      setAccountState(result.state);
      setUserProfile(result.userProfile);
      setEmployerProfile(result.employerProfile);
      setRole(result.role);
      authLogger.debug(`[AuthContext] Account state resolved: ${result.state}, role: ${result.role}`);
    } catch (error) {
      authLogger.error("Error resolving account state", error);
      setAccountState(AccountState.COMMUNITY);
      setRole("user");
    }
  }, []);

  // Allow manual refresh of account state (e.g., after employer approval)
  const refreshAccountState = useCallback(async () => {
    if (user) {
      await fetchAccountState(user.uid);
    }
  }, [user, fetchAccountState]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Handle sign out - remove push token for previous user
      if (previousUserId.current && !firebaseUser) {
        try {
          await removePushToken(previousUserId.current);
        } catch (error) {
          authLogger.error("Error removing push token", error);
        }
        setExpoPushToken(null);
      }

      setUser(firebaseUser);

      if (firebaseUser) {
        // Store user ID for later cleanup
        previousUserId.current = firebaseUser.uid;

        // Fetch complete account state (includes role, employer profile, etc.)
        await fetchAccountState(firebaseUser.uid);

        // Register for push notifications automatically
        try {
          const token = await registerForPushNotificationsAsync();
          if (token) {
            setExpoPushToken(token);
            await savePushToken(firebaseUser.uid, token);
          }
        } catch (error) {
          authLogger.error("Error registering push notifications", error);
        }
      } else {
        // Reset all state on sign out
        setRole(null);
        setAccountState(AccountState.COMMUNITY);
        setUserProfile(null);
        setEmployerProfile(null);
        previousUserId.current = null;
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [fetchAccountState]);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async (idToken: string) => {
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
  };

  const signOut = async () => {
    // Remove push token before signing out
    if (user) {
      try {
        await removePushToken(user.uid);
      } catch (error) {
        authLogger.error("Error removing push token on sign out", error);
      }
    }
    // Sign out from Google to allow choosing a different account next time
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      // Ignore errors - user may not have signed in with Google
      authLogger.debug("Google sign out skipped (not signed in via Google)");
    }
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        expoPushToken,
        // New account state fields
        accountState,
        userProfile,
        employerProfile,
        canAccessEmployerDashboard: canAccessEmployerDashboard(accountState),
        isEmployerPending: isEmployerPending(accountState),
        isEmployerApproved: isEmployerApproved(accountState),
        // Actions
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        registerPushNotifications,
        refreshAccountState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
