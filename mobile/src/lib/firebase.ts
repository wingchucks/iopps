import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { initializeAuth, getAuth, Auth } from "firebase/auth";
// @ts-ignore - React Native persistence import
import { getReactNativePersistence } from "@firebase/auth/dist/rn/index.js";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyDFZxqF7b6j7KwINbHHqYWZNrVBE8zTeEo",
  authDomain: "iopps-c2224.firebaseapp.com",
  projectId: "iopps-c2224",
  storageBucket: "iopps-c2224.firebasestorage.app",
  messagingSenderId: "95180813480",
  appId: "1:95180813480:web:f70a794b6f7d324f83be9d",
};

// Initialize Firebase with proper types
let app: FirebaseApp;
let auth: Auth;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  app = getApp();
  auth = getAuth(app);
}

// Initialize Firestore and Storage
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage };
