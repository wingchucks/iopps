import { formatDateTime, formatTimestamp, toDate } from "../lib/dates";

const instant = Date.UTC(2026, 9, 3, 15, 45, 30);

describe("toDate", () => {
  it("reads Firestore Timestamps and both of their JSON forms", () => {
    expect(toDate({ toDate: () => new Date(instant) })?.getTime()).toBe(instant);
    // Cached data goes through JSON and loses the Timestamp class.
    expect(toDate({ seconds: instant / 1000, nanoseconds: 0 })?.getTime()).toBe(instant);
    expect(toDate({ _seconds: instant / 1000, _nanoseconds: 500_000_000 })?.getTime()).toBe(instant + 500);
  });

  it("reads dates, ISO strings and milliseconds", () => {
    expect(toDate(new Date(instant))?.getTime()).toBe(instant);
    expect(toDate(new Date(instant).toISOString())?.getTime()).toBe(instant);
    expect(toDate(instant)?.getTime()).toBe(instant);
  });

  it("keeps a date-only day on that calendar day", () => {
    const day = toDate("2026-10-05");
    expect([day?.getFullYear(), day?.getMonth(), day?.getDate()]).toEqual([2026, 9, 5]);
  });

  it("returns null for anything that is not a date", () => {
    for (const value of [undefined, null, "", "not a date", {}, { seconds: "soon" }, Number.NaN, new Date(Number.NaN)]) {
      expect(toDate(value)).toBeNull();
    }
  });
});

describe("formatting", () => {
  it("never shows Invalid Date", () => {
    expect(formatTimestamp({ seconds: instant / 1000, nanoseconds: 0 })).not.toMatch(/Invalid/);
    expect(formatDateTime({ _seconds: instant / 1000 })).not.toMatch(/Invalid/);
    expect(formatTimestamp("not a date")).toBe("");
    expect(formatDateTime(undefined)).toBe("");
  });

  it("formats a date-only day as that day", () => {
    expect(formatTimestamp("2026-10-05")).toBe(new Date(2026, 9, 5).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }));
  });
});
