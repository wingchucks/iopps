export interface SetupRecoveryUserInput {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface SetupRecoveryUserDoc {
  uid: string;
  email: string;
  accountType: "community_member";
  role: "member";
  firstName: string;
  lastName: string;
  displayName: string;
  photoURL: string | null;
  profileComplete: false;
  disabled: false;
}

function nameFromEmail(email?: string | null): string {
  const local = email?.split("@")[0]?.trim();
  return local || "Community Member";
}

function splitDisplayName(displayName: string): { firstName: string; lastName: string } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || displayName,
    lastName: parts.slice(1).join(" "),
  };
}

export function buildSetupRecoveryUserDoc(input: SetupRecoveryUserInput): SetupRecoveryUserDoc {
  const displayName = input.displayName?.trim() || nameFromEmail(input.email);
  const { firstName, lastName } = splitDisplayName(displayName);

  return {
    uid: input.uid,
    email: input.email || "",
    accountType: "community_member",
    role: "member",
    firstName,
    lastName,
    displayName,
    photoURL: input.photoURL || null,
    profileComplete: false,
    disabled: false,
  };
}
