import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { auth, db } from "../lib/firebase";
import {
  registerForPushNotificationsAsync,
  savePushToken,
  removePushToken,
} from "../lib/notifications";
import { authLogger } from "../lib/logger";
import * as WebBrowser from "expo-web-browser";

// Required for web browser auth sessions to complete properly
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  expoPushToken: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  registerPushNotifications: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  expoPushToken: null,
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  registerPushNotifications: async () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
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

        // Fetch user role from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role || "user");
          } else {
            setRole("user");
          }
        } catch (error) {
          authLogger.error("Error fetching user role", error);
          setRole("user");
        }

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
        setRole(null);
        previousUserId.current = null;
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

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
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        registerPushNotifications,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
