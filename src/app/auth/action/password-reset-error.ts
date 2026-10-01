/** Explain Firebase's reset outcome without exposing provider messages or account details. */
export function passwordResetErrorMessage(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? error.code : "";
  switch (code) {
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "This password does not meet the account's password requirements. Try a longer password with uppercase and lowercase letters, a number and a symbol.";
    case "auth/expired-action-code":
    case "auth/invalid-action-code":
      return "This reset link has expired or is no longer valid. Request a new reset link.";
    case "auth/network-request-failed":
      return "We could not connect to the sign-in service. Check your connection and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes before trying again.";
    case "auth/user-disabled":
    case "auth/user-not-found":
    case "auth/operation-not-allowed":
      return "The sign-in service could not update this account. Contact IOPPS through the Contact page for help.";
    default:
      return "We could not update your password. Try again, or contact IOPPS through the Contact page if this continues.";
  }
}
