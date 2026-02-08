/**
 * Converts Firebase Auth error codes to user-friendly messages.
 *
 * Firebase errors come in the format: "Firebase: Error (auth/error-code)"
 * or have a `code` property like "auth/error-code"
 */

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // Sign in errors
  'auth/invalid-credential': 'Invalid email or password. Please try again.',
  'auth/user-not-found': 'Invalid email or password. Please try again.',
  'auth/wrong-password': 'Invalid email or password. Please try again.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',

  // Sign up errors
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
  'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',

  // Rate limiting
  'auth/too-many-requests': 'Too many failed attempts. Please wait a few minutes and try again.',

  // Network errors
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',

  // Password reset errors
  'auth/expired-action-code': 'This reset link has expired. Please request a new one.',
  'auth/invalid-action-code': 'This reset link is invalid. Please request a new one.',

  // Google sign-in errors
  'auth/popup-closed-by-user': 'Redirecting to Google sign-in...',
  'auth/popup-blocked': 'Redirecting to Google sign-in...',
  'auth/cancelled-popup-request': 'Sign-in cancelled. Please try again.',
  'auth/unauthorized-domain': 'This domain is not authorized for sign-in. Please contact support.',
  'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',

  // Session errors
  'auth/requires-recent-login': 'Please sign in again to complete this action.',
  'auth/user-token-expired': 'Your session has expired. Please sign in again.',
};

/**
 * Extracts the error code from a Firebase error.
 * Firebase errors can have the code in different places:
 * - error.code (e.g., "auth/invalid-credential")
 * - error.message containing "(auth/error-code)"
 */
function extractErrorCode(error: unknown): string | null {
  if (!error) return null;

  // Check for error.code property (Firebase Auth errors)
  if (typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }

  // Check for error code in message string
  if (error instanceof Error) {
    const match = error.message.match(/\(([^)]+)\)/);
    if (match && match[1].startsWith('auth/')) {
      return match[1];
    }

    // Also check for code patterns without parentheses
    for (const code of Object.keys(AUTH_ERROR_MESSAGES)) {
      if (error.message.includes(code.replace('auth/', ''))) {
        return code;
      }
    }
  }

  return null;
}

/**
 * Converts a Firebase Auth error to a user-friendly message.
 *
 * @param error - The error from Firebase Auth
 * @param defaultMessage - Optional custom default message
 * @returns A user-friendly error message
 */
export function getAuthErrorMessage(
  error: unknown,
  defaultMessage = 'Something went wrong. Please try again.'
): string {
  const errorCode = extractErrorCode(error);

  if (errorCode && AUTH_ERROR_MESSAGES[errorCode]) {
    return AUTH_ERROR_MESSAGES[errorCode];
  }

  return defaultMessage;
}
