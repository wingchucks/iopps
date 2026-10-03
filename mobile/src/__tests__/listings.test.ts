const mockDocs: Record<string, Record<string, unknown>> = {};

jest.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => name,
  doc: (_db: unknown, name: string, id: string) => `${name}/${id}`,
  query: (target: string, ...constraints: unknown[]) => ({ target, constraints }),
  orderBy: (...args: unknown[]) => ["orderBy", ...args],
  getDocs: async ({ target }: { target: string }) => ({
    docs: Object.entries(mockDocs)
      .filter(([path]) => path.startsWith(`${target}/`))
      .map(([path, data]) => ({ id: path.split("/")[1], data: () => data })),
  }),
  getDoc: async (path: string) => ({
    id: path.split("/")[1],
    exists: () => path in mockDocs,
    data: () => mockDocs[path],
  }),
}));

import { API_BASE } from "../lib/api";
import {
  eventTypeLabel,
  getConference,
  getPowwow,
  getScholarship,
  getVendor,
  listConferences,
  listLiveStreams,
  listPowwows,
  listScholarships,
  listVendors,
} from "../lib/listings";

const mockFetch = jest.fn();

function respond(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const events = [
  { id: "climate", title: "Climate Gathering", eventType: "conference", startDate: "2026-10-05", endDate: "2026-10-08", dates: "October 5–8, 2026", organizer: "Assembly of First Nations", location: "Hamilton, ON", sourceUrl: "https://afn.ca/events/climate", price: "See official event page" },
  { id: "gala", title: "Business Gala", eventType: "Gala / Business Gathering", startDate: "2026-11-04", orgName: "BC Achievement", rsvpLink: "https://example.ca/rsvp" },
  { id: "powwow-1", title: "Treaty Days Pow Wow", eventType: "powwow", startDate: "2026-10-04", location: "Onion Lake, SK", organizerName: "Onion Lake Cree Nation" },
  { id: "powwow-2", title: "Winter Pow Wow", category: "Pow Wow", startDate: "2026-12-01" },
  { id: "tbd", title: "Career Fair", eventType: "career_fair" },
];

beforeEach(() => {
  mockFetch.mockReset();
  (globalThis as { fetch: unknown }).fetch = mockFetch;
  for (const path of Object.keys(mockDocs)) delete mockDocs[path];
});

describe("events", () => {
  it("labels event types the way the website does", () => {
    expect(eventTypeLabel({ eventType: "powwow" })).toBe("Pow Wow");
    expect(eventTypeLabel({ eventType: "Pow Wow" })).toBe("Pow Wow");
    expect(eventTypeLabel({ category: "conference" })).toBe("Conference");
    expect(eventTypeLabel({ eventType: "career_fair" })).toBe("Career Fair");
    expect(eventTypeLabel({ eventType: "Gala / Business Gathering" })).toBe("Gala / Business Gathering");
    expect(eventTypeLabel({})).toBe("Other");
  });

  it("lists every event that is not a pow wow as a conference, soonest first", async () => {
    mockFetch.mockResolvedValue(respond(200, { events }));
    const conferences = await listConferences();
    expect(conferences.map((conference) => [conference.id, conference.format])).toEqual([
      ["climate", "Conference"],
      ["gala", "Gala / Business Gathering"],
      ["tbd", "Career Fair"],
    ]);
    expect(conferences[0]).toEqual({
      id: "climate",
      title: "Climate Gathering",
      organizerName: "Assembly of First Nations",
      description: "",
      location: "Hamilton, ON",
      startDate: "2026-10-05",
      endDate: "2026-10-08",
      dates: "October 5–8, 2026",
      registrationUrl: "https://afn.ca/events/climate",
      cost: "See official event page",
      format: "Conference",
      featured: false,
    });
    expect(conferences[1].registrationUrl).toBe("https://example.ca/rsvp");
    expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/api/events`, expect.objectContaining({ method: "GET" }));
  });

  it("lists pow wows, soonest first", async () => {
    mockFetch.mockResolvedValue(respond(200, { events }));
    const powwows = await listPowwows();
    expect(powwows.map((powwow) => powwow.id)).toEqual(["powwow-1", "powwow-2"]);
    expect(powwows[0]).toMatchObject({ name: "Treaty Days Pow Wow", host: "Onion Lake Cree Nation", location: "Onion Lake, SK" });
  });

  it("returns null for an event that is gone", async () => {
    mockFetch.mockResolvedValueOnce(respond(200, { event: events[2] }));
    expect(await getPowwow("powwow-1")).toMatchObject({ id: "powwow-1", name: "Treaty Days Pow Wow" });
    mockFetch.mockResolvedValueOnce(respond(404, { event: null }));
    expect(await getConference("gone")).toBeNull();
    expect(mockFetch.mock.calls[1][0]).toBe(`${API_BASE}/api/events/gone`);
  });
});

describe("scholarships", () => {
  it("lists only funding still taking applications", async () => {
    mockFetch.mockResolvedValue(
      respond(200, {
        scholarships: [
          { id: "open", slug: "open-award", title: "Open Award", ownerName: "Indspire", category: "Bursary", amount: "$2,000", deadline: "2026-12-01", educationLevel: "Post-secondary", province: "SK" },
          { id: "closed", title: "Closed Award", intakeClosed: true },
          { id: "rolling", title: "Rolling Award", deadline: "Rolling" },
        ],
      })
    );
    const scholarships = await listScholarships();
    expect(scholarships.map((scholarship) => scholarship.id)).toEqual(["open", "rolling"]);
    expect(scholarships[0]).toEqual({
      id: "open",
      slug: "open-award",
      title: "Open Award",
      provider: "Indspire",
      description: "",
      amount: "$2,000",
      deadline: "2026-12-01",
      level: "Post-secondary",
      region: "SK",
      type: "Bursary",
    });
    expect(scholarships[1]).toMatchObject({ slug: "rolling", type: "Scholarship", deadline: "Rolling" });
  });

  it("returns null for a scholarship that is gone", async () => {
    mockFetch.mockResolvedValueOnce(respond(404, { scholarship: null }));
    expect(await getScholarship("gone")).toBeNull();
    mockFetch.mockResolvedValueOnce(respond(500, { error: "Could not load this listing. Please try again." }));
    await expect(getScholarship("broken")).rejects.toMatchObject({ status: 500 });
  });
});

describe("live streams", () => {
  it("shows the live broadcast, upcoming broadcasts and replays once each", async () => {
    mockFetch.mockResolvedValue(
      respond(200, {
        live: { id: "live1234567", title: "Live now", actualStart: "2026-10-03T15:00:00Z" },
        upcoming: [{ id: "next1234567", title: "Next week", scheduledStart: "2026-10-10T15:00:00Z" }],
        recent: [{ id: "live1234567", title: "Live now" }, { id: "past1234567", title: "Last week", publishedAt: "2026-09-26T15:00:00Z" }],
      })
    );
    const streams = await listLiveStreams();
    expect(streams.map((stream) => [stream.id, stream.status])).toEqual([
      ["live1234567", "Live Now"],
      ["next1234567", "Upcoming"],
      ["past1234567", "Replay"],
    ]);
    expect(streams[2]).toMatchObject({ platform: "YouTube", url: "https://www.youtube.com/watch?v=past1234567" });
    expect(streams[2].startTime).not.toBe("");
  });

  it("reports the feed being unavailable", async () => {
    mockFetch.mockResolvedValue(respond(503, { live: null, upcoming: [], recent: [], error: "The livestream feed is temporarily unavailable." }));
    await expect(listLiveStreams()).rejects.toMatchObject({ message: "The livestream feed is temporarily unavailable." });
  });
});

describe("shop vendors", () => {
  it("reads the public shop_vendors records the website lists", async () => {
    mockDocs["shop_vendors/beadwork-by-dawn"] = {
      name: "Beadwork by Dawn",
      category: "Art",
      description: "Hand beading",
      logo: "https://example.ca/logo.png",
      bannerImage: "",
      location: { city: "Prince Albert", province: "SK" },
      website: "beadwork.example.ca",
      email: "dawn@example.ca",
      phone: "306-555-0100",
      socialLinks: { instagram: "@beadwork", facebook: "", linkedin: "" },
      featured: true,
    };
    mockDocs["jobs/not-a-vendor"] = { name: "Ignored" };
    const vendors = await listVendors();
    expect(vendors).toEqual([
      {
        id: "beadwork-by-dawn",
        businessName: "Beadwork by Dawn",
        category: "Art",
        location: "Prince Albert, SK",
        about: "Hand beading",
        logoUrl: "https://example.ca/logo.png",
        heroImageUrl: "",
        websiteUrl: "beadwork.example.ca",
        contactEmail: "dawn@example.ca",
        contactPhone: "306-555-0100",
        instagram: "@beadwork",
        facebook: "",
        featured: true,
      },
    ]);
    expect(await getVendor("beadwork-by-dawn")).toMatchObject({ businessName: "Beadwork by Dawn" });
    expect(await getVendor("missing")).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
