/** Only allowlisted codes become user-facing text. Never expose provider messages. */
export function authErrorMessage(error: unknown, fallback = "We couldn’t complete this request. Please try again."): string {
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  switch (code) {
    case "auth/invalid-email": return "Please enter a valid email address.";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements": return "Please choose a stronger password that meets the password requirements.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential": return "The email or password is incorrect. Please check your details and try again.";
    case "auth/email-already-in-use":
    case "auth/account-exists-with-different-credential": return "We couldn’t create an account with these details. Try signing in or resetting your password.";
    case "auth/too-many-requests": return "Too many attempts. Please wait and try again later.";
    case "auth/network-request-failed": return "Please check your connection and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request": return "Sign-in was cancelled. Please try again when you’re ready.";
    case "auth/popup-blocked": return "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.";
    case "auth/requires-recent-login":
    case "auth/user-token-expired":
    case "auth/invalid-user-token": return "Please sign in again before continuing.";
    case "auth/expired-action-code":
    case "auth/invalid-action-code": return "This link is no longer valid. Please request a new one.";
    case "auth/user-disabled": return "We couldn’t sign you in. Please contact support for help.";
    case "auth/operation-not-allowed": return "This sign-in method is temporarily unavailable. Please try another method.";
    default: return fallback;
  }
}
