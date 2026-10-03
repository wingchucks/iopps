/**
 * Saved jobs use the website's saved_items records. The repository's emulator suite
 * (tests/mobile-firestore-rules-emulator.test.ts) runs this module against the real rules.
 */
type Query = { target: string; constraints: unknown[][] };

const mockSaved = new Map<string, Record<string, unknown>>();
const mockQueries: Query[] = [];
const mockWrites: unknown[][] = [];

jest.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => name,
  doc: (_db: unknown, name: string, id: string) => `${name}/${id}`,
  query: (target: string, ...constraints: unknown[][]) => ({ target, constraints }),
  where: (...args: unknown[]) => ["where", ...args],
  orderBy: (...args: unknown[]) => ["orderBy", ...args],
  serverTimestamp: () => "server-time",
  getDocs: async (query: Query) => {
    mockQueries.push(query);
    const filters = query.constraints.filter((constraint) => constraint[0] === "where");
    const docs = [...mockSaved.entries()]
      .filter(([, data]) => filters.every(([, field, , value]) => data[field as string] === value))
      .map(([path, data]) => ({ id: path.split("/")[1], ref: path, data: () => data }));
    return { docs, empty: docs.length === 0 };
  },
  setDoc: async (path: string, data: Record<string, unknown>) => {
    mockWrites.push(["set", path, data]);
    mockSaved.set(path, data);
  },
  deleteDoc: async (path: string) => {
    mockWrites.push(["delete", path]);
    mockSaved.delete(path);
  },
}));

import { API_BASE } from "../lib/api";
import { isJobSaved, listSavedJobs, savedJobStates, saveJob, unsaveJob } from "../lib/savedJobs";

const { auth } = jest.requireMock("../lib/firebase") as { auth: { currentUser: unknown } };
const mockFetch = jest.fn();

beforeEach(() => {
  mockSaved.clear();
  mockQueries.length = 0;
  mockWrites.length = 0;
  mockFetch.mockReset();
  (globalThis as { fetch: unknown }).fetch = mockFetch;
  auth.currentUser = { getIdToken: async () => "id-token" };
});

describe("saved jobs", () => {
  it("lists the member's saved jobs, filtered on their own user ID as the rules require", async () => {
    mockSaved.set("saved_items/me_job-1", { userId: "me", postId: "job-1", postTitle: "Cook", postType: "job", postOrgName: "Cafe", savedAt: { seconds: 5 } });
    mockSaved.set("saved_items/me_event-1", { userId: "me", postId: "event-1", postTitle: "Gala", postType: "event" });
    mockSaved.set("saved_items/other_job-1", { userId: "other", postId: "job-1", postType: "job" });

    expect(await listSavedJobs("me")).toEqual([
      { id: "me_job-1", jobId: "job-1", title: "Cook", employerName: "Cafe", savedAt: { seconds: 5 } },
    ]);
    expect(mockQueries[0]).toEqual({
      target: "saved_items",
      constraints: [["where", "userId", "==", "me"], ["orderBy", "savedAt", "desc"]],
    });
  });

  it("saves a job in the website's shape, once", async () => {
    await saveJob("me", { id: "job-1", title: "Cook", employerName: "Cafe" });
    await saveJob("me", { id: "job-1", title: "Cook", employerName: "Cafe" });
    expect(mockWrites).toEqual([
      ["set", "saved_items/me_job-1", { userId: "me", postId: "job-1", postTitle: "Cook", postType: "job", postOrgName: "Cafe", savedAt: "server-time" }],
    ]);
    expect(await isJobSaved("me", "job-1")).toBe(true);
    expect(await isJobSaved("other", "job-1")).toBe(false);
  });

  it("removes every save of a job, including one the website made under another ID", async () => {
    mockSaved.set("saved_items/me_job-1", { userId: "me", postId: "job-1", postType: "job" });
    mockSaved.set("saved_items/legacy-random-id", { userId: "me", postId: "job-1", postType: "job" });
    mockSaved.set("saved_items/me_job-2", { userId: "me", postId: "job-2", postType: "job" });
    await unsaveJob("me", "job-1");
    expect([...mockSaved.keys()]).toEqual(["saved_items/me_job-2"]);
  });

  it("asks the website which saved jobs are still open, 100 at a time", async () => {
    const ids = Array.from({ length: 101 }, (_, index) => `job-${index}`);
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ statuses: { "job-0": "open", "job-1": "closed", "job-2": "bogus" } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ statuses: { "job-100": "unavailable" } }) });
    expect(await savedJobStates(ids)).toEqual({ "job-0": "open", "job-1": "closed", "job-100": "unavailable" });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/saved/status`);
    expect(JSON.parse(init.body).items).toHaveLength(100);
    expect(JSON.parse(init.body).items[0]).toEqual({ postId: "job-0", postType: "job" });
    expect(init.headers.Authorization).toBe("Bearer id-token");
    expect(await savedJobStates([])).toEqual({});
  });
});
