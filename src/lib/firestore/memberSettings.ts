import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export type FieldVisibility = "everyone" | "members" | "only_me";

export interface ProfileVisibility {
  email: FieldVisibility;
  community: FieldVisibility;
  location: FieldVisibility;
  bio: FieldVisibility;
  interests: FieldVisibility;
}

export interface MemberSettings {
  userId: string;
  profileVisibility: "public" | "members_only" | "private";
  fieldVisibility: ProfileVisibility;
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;
  showInDirectory: boolean;
  updatedAt: unknown;
}

const COLLECTION = "member_settings";

const defaultFieldVisibility: ProfileVisibility = {
  email: "only_me",
  community: "everyone",
  location: "members",
  bio: "everyone",
  interests: "everyone",
};

const defaultSettings: Omit<MemberSettings, "userId" | "updatedAt"> = {
  profileVisibility: "public",
  fieldVisibility: defaultFieldVisibility,
  showOnlineStatus: true,
  allowDirectMessages: true,
  showInDirectory: true,
};

export async function getMemberSettings(
  userId: string
): Promise<MemberSettings> {
  const snap = await getDoc(doc(db, COLLECTION, userId));
  if (!snap.exists()) {
    return {
      userId,
      ...defaultSettings,
      updatedAt: null,
    };
  }
  return snap.data() as MemberSettings;
}

export async function updateMemberSettings(
  userId: string,
  data: Partial<Omit<MemberSettings, "userId" | "updatedAt">>
): Promise<void> {
  const ref = doc(db, COLLECTION, userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      userId,
      ...defaultSettings,
      ...data,
      updatedAt: serverTimestamp(),
    });
  }
}

export async function updatePrivacySettings(
  userId: string,
  data: {
    profileVisibility?: MemberSettings["profileVisibility"];
    fieldVisibility?: Partial<ProfileVisibility>;
    showOnlineStatus?: boolean;
    allowDirectMessages?: boolean;
    showInDirectory?: boolean;
  }
): Promise<void> {
  const current = await getMemberSettings(userId);
  const update: Partial<Omit<MemberSettings, "userId" | "updatedAt">> = {};

  if (data.profileVisibility !== undefined) {
    update.profileVisibility = data.profileVisibility;
  }
  if (data.fieldVisibility) {
    update.fieldVisibility = {
      ...current.fieldVisibility,
      ...data.fieldVisibility,
    };
  }
  if (data.showOnlineStatus !== undefined) {
    update.showOnlineStatus = data.showOnlineStatus;
  }
  if (data.allowDirectMessages !== undefined) {
    update.allowDirectMessages = data.allowDirectMessages;
  }
  if (data.showInDirectory !== undefined) {
    update.showInDirectory = data.showInDirectory;
  }

  await updateMemberSettings(userId, update);
}
