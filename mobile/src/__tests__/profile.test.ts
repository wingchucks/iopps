/**
 * The member profile is members/{uid}. The repository's emulator suite
 * (tests/mobile-firestore-rules-emulator.test.ts) runs this module against the real rules.
 */
const mockRecords = new Map<string, Record<string, unknown>>();
const mockWrites: unknown[][] = [];

jest.mock("firebase/firestore", () => ({
  doc: (_db: unknown, name: string, id: string) => `${name}/${id}`,
  serverTimestamp: () => "server-time",
  getDoc: async (path: string) => ({ exists: () => mockRecords.has(path), data: () => mockRecords.get(path) }),
  setDoc: async (path: string, data: Record<string, unknown>) => {
    mockWrites.push(["set", path, data]);
  },
  updateDoc: async (path: string, data: Record<string, unknown>) => {
    mockWrites.push(["update", path, data]);
  },
}));

import { getMemberProfile, saveMemberProfile } from "../lib/profile";

beforeEach(() => {
  mockRecords.clear();
  mockWrites.length = 0;
});

describe("getMemberProfile", () => {
  it("prefers the member record, as the website's application snapshot does", async () => {
    mockRecords.set("users/me", { email: "me@example.ca", displayName: "Old Name", location: "Regina", resumeUrl: "https://old/resume.pdf" });
    mockRecords.set("members/me", { displayName: "New Name", bio: "Cook", photoURL: "https://example.ca/me.jpg" });
    expect(await getMemberProfile("me")).toEqual({
      uid: "me",
      email: "me@example.ca",
      displayName: "New Name",
      location: "Regina",
      bio: "Cook",
      photoURL: "https://example.ca/me.jpg",
      // Applications attach only the resume saved on the member record.
      resumeUrl: "",
      resumeFileName: "",
    });
  });

  it("returns an empty profile for a new account", async () => {
    expect(await getMemberProfile("new")).toMatchObject({ uid: "new", displayName: "", resumeUrl: "" });
  });
});

describe("saveMemberProfile", () => {
  it("updates only the fields given, and dates a new resume", async () => {
    mockRecords.set("members/me", { uid: "me" });
    await saveMemberProfile("me", "me@example.ca", { bio: "Cook", photoURL: undefined, resumeUrl: "https://storage/r.pdf", resumeFileName: "r.pdf" });
    const [[kind, path, data]] = mockWrites as [[string, string, Record<string, unknown>]];
    expect([kind, path]).toEqual(["update", "members/me"]);
    expect(data).toEqual({
      bio: "Cook",
      resumeUrl: "https://storage/r.pdf",
      resumeFileName: "r.pdf",
      resumeUploadedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      updatedAt: "server-time",
    });
  });

  it("clears a removed resume", async () => {
    mockRecords.set("members/me", { uid: "me" });
    await saveMemberProfile("me", null, { resumeUrl: "", resumeFileName: "" });
    expect(mockWrites[0][2]).toEqual({ resumeUrl: "", resumeFileName: "", resumeUploadedAt: "", updatedAt: "server-time" });
  });

  it("creates the member record the first time, with the fields the rules allow", async () => {
    await saveMemberProfile("new", "new@example.ca", { displayName: "New Member" });
    expect(mockWrites).toEqual([
      ["set", "members/new", { uid: "new", email: "new@example.ca", displayName: "New Member", updatedAt: "server-time", joinedAt: "server-time" }],
    ]);
  });
});
