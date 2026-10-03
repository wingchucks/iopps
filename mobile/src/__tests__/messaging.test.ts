/**
 * Messaging writes must match the website and firestore.rules exactly; the
 * repository's emulator suite (tests/mobile-messaging-rules-emulator.test.ts)
 * runs this module against the real rules.
 */

type Batch = { set: unknown[][]; update: unknown[][]; committed: boolean };
type Listener = { target: unknown; next: (snapshot: any) => void; error: (error: any) => void; unsubscribe: jest.Mock };

const mockBatches: Batch[] = [];
const mockListeners: Listener[] = [];
const mockCommit: { error: Error | null } = { error: null };
const mockNotify = jest.fn();
const mockUpdateDoc = jest.fn(async (..._args: unknown[]) => undefined);
const mockGetDocs = jest.fn(async (..._args: unknown[]) => ({ size: 3 }));

jest.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => name,
  doc: (_db: unknown, name: string, id: string) => `${name}/${id}`,
  query: (target: string, ...constraints: unknown[]) => ({ target, constraints }),
  where: (...args: unknown[]) => ["where", ...args],
  orderBy: (...args: unknown[]) => ["orderBy", ...args],
  limitToLast: (count: number) => ["limitToLast", count],
  serverTimestamp: () => "server-time",
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  writeBatch: () => {
    const batch: Batch = { set: [], update: [], committed: false };
    mockBatches.push(batch);
    return {
      set: (ref: unknown, data: unknown) => batch.set.push([ref, data]),
      update: (ref: unknown, data: unknown) => batch.update.push([ref, data]),
      commit: async () => {
        if (mockCommit.error) throw mockCommit.error;
        batch.committed = true;
      },
    };
  },
  onSnapshot: (target: unknown, next: (snapshot: any) => void, error: (error: any) => void) => {
    const unsubscribe = jest.fn();
    mockListeners.push({ target, next, error, unsubscribe });
    return unsubscribe;
  },
}));

jest.mock("../lib/messageNotifications", () => ({
  notifyNewMessage: (...args: unknown[]) => mockNotify(...args),
}));

import {
  getConversationPeer,
  getUnreadConversationCount,
  markConversationRead,
  messagePreview,
  onConversation,
  onConversations,
  onMessages,
  onUnreadConversationCount,
  sendMessage,
} from "../lib/messaging";

const { auth } = jest.requireMock("../lib/firebase") as { auth: { currentUser: unknown } };

// A query document; every read asks for estimated server times.
function snapshotDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: (options: unknown) => {
      expect(options).toEqual({ serverTimestamps: "estimate" });
      return data;
    },
  };
}

beforeEach(() => {
  mockBatches.length = 0;
  mockListeners.length = 0;
  mockCommit.error = null;
  mockNotify.mockReset();
  mockNotify.mockResolvedValue({ state: "accepted" });
  mockUpdateDoc.mockClear();
  mockGetDocs.mockClear();
  auth.currentUser = null;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("sendMessage", () => {
  it("saves the message and its preview in one commit with only the fields the rules allow", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1700000000000);
    const saved = await sendMessage("conv-1", "me", "Hello there", "them");

    expect(mockBatches).toEqual([
      {
        set: [["messages/conv-1_1700000000000", { conversationId: "conv-1", senderId: "me", text: "Hello there", createdAt: "server-time" }]],
        update: [["conversations/conv-1", { lastMessage: "Hello there", lastMessageAt: "server-time", lastSenderId: "me", unreadBy: "them" }]],
        committed: true,
      },
    ]);
    expect(saved.messageId).toBe("conv-1_1700000000000");
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith(
      "conv-1_1700000000000",
      "me",
      expect.objectContaining({ endpoint: expect.stringMatching(/^https:\/\/[^/]+\/api\/messages\/notify$/) })
    );
    await expect(saved.notification).resolves.toEqual({ state: "accepted" });
  });

  it("refuses empty and over-long messages without writing anything", async () => {
    await expect(sendMessage("conv-1", "me", "", "them")).rejects.toThrow("1 to 5,000 characters");
    await expect(sendMessage("conv-1", "me", "x".repeat(5001), "them")).rejects.toThrow("1 to 5,000 characters");
    expect(mockBatches).toHaveLength(0);
    expect(mockNotify).not.toHaveBeenCalled();

    await sendMessage("conv-1", "me", "x".repeat(5000), "them");
    expect(mockBatches[0].committed).toBe(true);
  });

  it("never asks for an email about a message that was not saved", async () => {
    mockCommit.error = Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
    await expect(sendMessage("conv-1", "me", "Hello", "them")).rejects.toMatchObject({ code: "permission-denied" });
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("reports a failed email notification without failing the saved message", async () => {
    mockNotify.mockRejectedValue(new Error("Network failed"));
    const saved = await sendMessage("conv-1", "me", "Hello", "them");
    expect(mockBatches[0].committed).toBe(true);
    await expect(saved.notification).resolves.toEqual({ state: "failed" });
  });
});

describe("messagePreview", () => {
  it("keeps 80 characters plus an ellipsis", () => {
    expect(messagePreview("Short")).toBe("Short");
    expect(messagePreview("a".repeat(80))).toBe("a".repeat(80));
    expect(messagePreview("a".repeat(81))).toBe(`${"a".repeat(80)}…`);
  });

  it("never cuts an emoji in half", () => {
    expect(messagePreview(`${"a".repeat(79)}\u{1F600}b`)).toBe(`${"a".repeat(79)}…`);
    const emoji = messagePreview("\u{1F600}".repeat(50));
    expect(emoji.length).toBeLessThanOrEqual(81);
    expect(emoji).toBe(`${"\u{1F600}".repeat(40)}…`);
  });
});

describe("reading conversations", () => {
  it("lists the member's conversations newest first and keeps only well-formed fields", () => {
    const onChange = jest.fn();
    const onError = jest.fn();
    const unsubscribe = onConversations("me", onChange, onError);
    const [listener] = mockListeners;

    expect(listener.target).toEqual({
      target: "conversations",
      constraints: [["where", "participants", "array-contains", "me"], ["orderBy", "lastMessageAt", "desc"]],
    });
    listener.next({
      docs: [
        snapshotDoc("c1", { participants: ["me", "them", 7], lastMessage: "Hi", lastMessageAt: "time", lastSenderId: "them", unreadBy: "me" }),
        snapshotDoc("c2", { participants: "me", lastMessage: { text: "Not a string" }, employerName: "Ignored" }),
      ],
    });
    expect(onChange).toHaveBeenCalledWith([
      { id: "c1", participants: ["me", "them"], lastMessage: "Hi", lastMessageAt: "time", lastSenderId: "them", unreadBy: "me" },
      { id: "c2", participants: [], lastMessage: "", lastMessageAt: null, lastSenderId: "", unreadBy: "" },
    ]);

    const denied = { code: "permission-denied" };
    listener.error(denied);
    expect(onError).toHaveBeenCalledWith(denied);
    unsubscribe();
    expect(listener.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("follows one conversation and reports a removed one as unavailable", () => {
    const onChange = jest.fn();
    onConversation("c1", onChange, jest.fn());
    const [listener] = mockListeners;

    expect(listener.target).toBe("conversations/c1");
    listener.next({ exists: () => false });
    expect(onChange).toHaveBeenLastCalledWith(null);
    listener.next({ exists: () => true, ...snapshotDoc("c1", { participants: ["me", "them"], unreadBy: "me" }) });
    expect(onChange).toHaveBeenLastCalledWith({
      id: "c1", participants: ["me", "them"], lastMessage: "", lastMessageAt: null, lastSenderId: "", unreadBy: "me",
    });
  });

  it("loads the latest 50 messages oldest first, as plain text", () => {
    const onChange = jest.fn();
    onMessages("c1", onChange, jest.fn());
    const [listener] = mockListeners;

    expect(listener.target).toEqual({
      target: "messages",
      constraints: [["where", "conversationId", "==", "c1"], ["orderBy", "createdAt", "asc"], ["limitToLast", 50]],
    });
    listener.next({
      docs: [
        snapshotDoc("c1_1", { conversationId: "c1", senderId: "them", text: "Hello", createdAt: "time" }),
        snapshotDoc("c1_2", { conversationId: "c1", senderId: "me", text: { html: "<b>Not a string</b>" } }),
      ],
    });
    expect(onChange).toHaveBeenCalledWith([
      { id: "c1_1", conversationId: "c1", senderId: "them", text: "Hello", createdAt: "time" },
      { id: "c1_2", conversationId: "c1", senderId: "me", text: "", createdAt: null },
    ]);
  });

  it("counts the conversations the member has not read", async () => {
    const onChange = jest.fn();
    onUnreadConversationCount("me", onChange, jest.fn());
    const [listener] = mockListeners;
    const unreadQuery = {
      target: "conversations",
      constraints: [["where", "unreadBy", "==", "me"], ["where", "participants", "array-contains", "me"]],
    };

    expect(listener.target).toEqual(unreadQuery);
    listener.next({ size: 2 });
    expect(onChange).toHaveBeenCalledWith(2);
    await expect(getUnreadConversationCount("me")).resolves.toBe(3);
    expect(mockGetDocs).toHaveBeenCalledWith(unreadQuery);
  });

  it("clears only the member's own unread marker", async () => {
    await markConversationRead("c1");
    expect(mockUpdateDoc).toHaveBeenCalledWith("conversations/c1", { unreadBy: "" });
  });
});

describe("getConversationPeer", () => {
  const signedIn = { uid: "me", getIdToken: jest.fn(async () => "fictional-token") };

  function respond(status: number, body: unknown) {
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  }

  it("asks the website for the other participant once per conversation", async () => {
    auth.currentUser = signedIn;
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      respond(200, { peer: { uid: "them", displayName: "IOPPS member" } }) as unknown as Response
    );

    await expect(getConversationPeer("peer conversation")).resolves.toEqual({ uid: "them", displayName: "IOPPS member" });
    await expect(getConversationPeer("peer conversation")).resolves.toEqual({ uid: "them", displayName: "IOPPS member" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/[^/]+\/api\/messages\/peer\?conversationId=peer%20conversation$/),
      { headers: { Authorization: "Bearer fictional-token" } }
    );
  });

  it("falls back when the website cannot answer, and tries again later", async () => {
    auth.currentUser = signedIn;
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(respond(503, { error: "Unable to load conversation" }) as unknown as Response)
      .mockResolvedValueOnce(respond(200, { peer: { uid: "them", displayName: "Named member", photoURL: 7 } }) as unknown as Response);

    await expect(getConversationPeer("retry conversation")).resolves.toBeNull();
    await expect(getConversationPeer("retry conversation")).resolves.toEqual({ uid: "them", displayName: "Named member" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does nothing when nobody is signed in", async () => {
    const fetchMock = jest.spyOn(global, "fetch");
    await expect(getConversationPeer("signed-out conversation")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("website address", () => {
  const original = process.env.EXPO_PUBLIC_API_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = original;
  });

  async function notifyEndpoint(configured: string | undefined) {
    if (configured === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = configured;
    let isolated: typeof import("../lib/messaging") | undefined;
    jest.isolateModules(() => {
      isolated = require("../lib/messaging");
    });
    await isolated!.sendMessage("conv-1", "me", "Hello", "them");
    return mockNotify.mock.calls[mockNotify.mock.calls.length - 1][2].endpoint;
  }

  it("defaults to the canonical website", async () => {
    await expect(notifyEndpoint(undefined)).resolves.toBe("https://www.iopps.ca/api/messages/notify");
  });

  it("uses the configured address without a trailing slash", async () => {
    await expect(notifyEndpoint("https://iopps.ca/")).resolves.toBe("https://iopps.ca/api/messages/notify");
  });
});
