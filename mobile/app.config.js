export default {
  expo: {
    name: "IOPPS",
    slug: "iopps",
    version: "1.2.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    scheme: "iopps",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0F172A",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "ca.iopps.app",
      infoPlist: {
        NSCameraUsageDescription:
          "IOPPS needs camera access to upload profile photos and documents.",
        NSPhotoLibraryUsageDescription:
          "IOPPS needs photo library access to upload profile photos and resumes.",
        NSFaceIDUsageDescription:
          "IOPPS uses Face ID for secure and quick sign-in to your account.",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0F172A",
      },
      package: "ca.iopps.app",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
      permissions: [
        "android.permission.USE_BIOMETRIC",
        "android.permission.USE_FINGERPRINT",
      ],
    },
    plugins: [
      "@sentry/react-native/expo",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#14B8A6",
        },
      ],
      [
        "expo-local-authentication",
        {
          faceIDPermission: "Allow IOPPS to use Face ID for quick sign-in.",
        },
      ],
    ],
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro",
    },
    extra: {
      eas: {
        projectId: "eb1e721b-1215-4155-8f49-96f7e361953a",
      },
    },
    owner: "wingchucks",
  },
};
