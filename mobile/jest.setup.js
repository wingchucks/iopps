// Jest setup file
import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-local-authentication
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1, 2])),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

// Mock NetInfo
const mockNetInfoListeners = [];
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((callback) => {
    mockNetInfoListeners.push(callback);
    return () => {
      const index = mockNetInfoListeners.indexOf(callback);
      if (index > -1) mockNetInfoListeners.splice(index, 1);
    };
  }),
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    })
  ),
  __triggerNetworkChange: (state) => {
    mockNetInfoListeners.forEach((listener) => listener(state));
  },
}));

// Mock Firebase Auth
const mockAuthStateListeners = [];
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((auth, callback) => {
    mockAuthStateListeners.push(callback);
    // Initially call with null (not logged in)
    setTimeout(() => callback(null), 0);
    return () => {
      const index = mockAuthStateListeners.indexOf(callback);
      if (index > -1) mockAuthStateListeners.splice(index, 1);
    };
  }),
  signInWithEmailAndPassword: jest.fn(() =>
    Promise.resolve({
      user: { uid: 'test-uid', email: 'test@example.com' },
    })
  ),
  createUserWithEmailAndPassword: jest.fn(() =>
    Promise.resolve({
      user: { uid: 'new-uid', email: 'new@example.com' },
    })
  ),
  signOut: jest.fn(() => Promise.resolve()),
  __triggerAuthStateChange: (user) => {
    mockAuthStateListeners.forEach((listener) => listener(user));
  },
}));

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(() =>
    Promise.resolve({
      exists: () => true,
      data: () => ({ role: 'user' }),
    })
  ),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
}));

// Mock Firebase Storage
jest.mock('firebase/storage', () => ({
  ref: jest.fn(() => ({})),
  uploadBytesResumable: jest.fn(() => ({
    on: jest.fn((event, onProgress, onError, onComplete) => {
      setTimeout(() => onComplete(), 100);
    }),
    snapshot: { ref: {} },
  })),
  getDownloadURL: jest.fn(() => Promise.resolve('https://example.com/file.jpg')),
  deleteObject: jest.fn(() => Promise.resolve()),
}));

// Mock Firebase
jest.mock('./src/lib/firebase', () => ({
  db: {},
  auth: {
    currentUser: null,
  },
  storage: {},
}));

// Mock notifications lib
jest.mock('./src/lib/notifications', () => ({
  registerForPushNotificationsAsync: jest.fn(() => Promise.resolve('mock-push-token')),
  savePushToken: jest.fn(() => Promise.resolve()),
  removePushToken: jest.fn(() => Promise.resolve()),
}));

// Mock Expo Notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'mock-token' })),
  setNotificationChannelAsync: jest.fn(),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  NavigationContainer: ({ children }) => children,
}));

// Silence console.error and console.warn in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
