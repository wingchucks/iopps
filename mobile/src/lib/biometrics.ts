import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { biometricsLogger } from "./logger";

const BIOMETRIC_ENABLED_KEY = "biometric_enabled";
const BIOMETRIC_USER_KEY = "biometric_user_id";

export interface BiometricCapabilities {
  isAvailable: boolean;
  biometricTypes: LocalAuthentication.AuthenticationType[];
  hasFaceId: boolean;
  hasFingerprint: boolean;
  hasIris: boolean;
}

/**
 * Check if biometric authentication is available on this device
 */
export async function checkBiometricCapabilities(): Promise<BiometricCapabilities> {
  const isAvailable = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const biometricTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

  return {
    isAvailable: isAvailable && isEnrolled,
    biometricTypes,
    hasFaceId: biometricTypes.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
    ),
    hasFingerprint: biometricTypes.includes(
      LocalAuthentication.AuthenticationType.FINGERPRINT
    ),
    hasIris: biometricTypes.includes(
      LocalAuthentication.AuthenticationType.IRIS
    ),
  };
}

/**
 * Get a friendly name for the biometric type
 */
export function getBiometricTypeName(capabilities: BiometricCapabilities): string {
  if (capabilities.hasFaceId) return "Face ID";
  if (capabilities.hasFingerprint) return "Fingerprint";
  if (capabilities.hasIris) return "Iris";
  return "Biometric";
}

/**
 * Authenticate the user using biometrics
 */
export async function authenticateWithBiometrics(
  promptMessage: string = "Authenticate to continue"
): Promise<{ success: boolean; error?: string }> {
  try {
    const capabilities = await checkBiometricCapabilities();

    if (!capabilities.isAvailable) {
      return {
        success: false,
        error: "Biometric authentication is not available on this device",
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
      fallbackLabel: "Use passcode",
    });

    if (result.success) {
      return { success: true };
    }

    // Handle different error cases
    if (result.error === "user_cancel") {
      return { success: false, error: "Authentication cancelled" };
    }
    if (result.error === "user_fallback") {
      return { success: false, error: "User chose fallback" };
    }
    if (result.error === "system_cancel") {
      return { success: false, error: "System cancelled authentication" };
    }
    if (result.error === "lockout") {
      return { success: false, error: "Too many failed attempts. Try again later." };
    }

    return { success: false, error: result.error || "Authentication failed" };
  } catch (error) {
    biometricsLogger.error("Biometric authentication error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if biometric login is enabled for this app
 */
export async function isBiometricLoginEnabled(): Promise<boolean> {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === "true";
  } catch {
    return false;
  }
}

/**
 * Enable biometric login and store user ID securely
 */
export async function enableBiometricLogin(userId: string): Promise<boolean> {
  try {
    // First authenticate to confirm user wants to enable
    const auth = await authenticateWithBiometrics(
      "Authenticate to enable biometric login"
    );

    if (!auth.success) {
      return false;
    }

    // Store the user ID securely
    await SecureStore.setItemAsync(BIOMETRIC_USER_KEY, userId);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true");

    return true;
  } catch (error) {
    biometricsLogger.error("Error enabling biometric login", error);
    return false;
  }
}

/**
 * Disable biometric login
 */
export async function disableBiometricLogin(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_USER_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  } catch (error) {
    biometricsLogger.error("Error disabling biometric login", error);
  }
}

/**
 * Get the stored user ID for biometric login
 */
export async function getBiometricUserId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(BIOMETRIC_USER_KEY);
  } catch {
    return null;
  }
}

/**
 * Attempt biometric login - authenticate and return stored user ID
 */
export async function biometricLogin(): Promise<{
  success: boolean;
  userId?: string;
  error?: string
}> {
  try {
    // Check if biometric login is enabled
    const enabled = await isBiometricLoginEnabled();
    if (!enabled) {
      return { success: false, error: "Biometric login is not enabled" };
    }

    // Get the stored user ID
    const userId = await getBiometricUserId();
    if (!userId) {
      return { success: false, error: "No user found for biometric login" };
    }

    // Authenticate
    const auth = await authenticateWithBiometrics("Sign in to IOPPS");
    if (!auth.success) {
      return { success: false, error: auth.error };
    }

    return { success: true, userId };
  } catch (error) {
    biometricsLogger.error("Biometric login error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
