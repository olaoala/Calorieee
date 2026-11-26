import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  assertDateKey,
  assertValidTimeZone,
  dateKeyFromInstant,
  daysAgoStr,
  formatDateKey,
  isValidDateKey,
  isValidTimeZone,
  todayStr,
} from "../src/lib/date";

describe("profile-local calendar date keys", () => {
  it("changes the Lagos date immediately across local midnight", () => {
    expect(todayStr("Africa/Lagos", new Date("2024-01-01T22:59:59.999Z"))).toBe("2024-01-01");
    expect(todayStr("Africa/Lagos", new Date("2024-01-01T23:00:00.000Z"))).toBe("2024-01-02");
  });

  it("handles positive- and negative-offset timezone boundaries", () => {
    expect(todayStr("Asia/Kolkata", new Date("2024-01-01T18:29:59.999Z"))).toBe("2024-01-01");
    expect(todayStr("Asia/Kolkata", new Date("2024-01-01T18:30:00.000Z"))).toBe("2024-01-02");
    expect(todayStr("America/Los_Angeles", new Date("2024-01-02T07:59:59.999Z"))).toBe(
      "2024-01-01"
    );
    expect(todayStr("America/Los_Angeles", new Date("2024-01-02T08:00:00.000Z"))).toBe(
      "2024-01-02"
    );
  });

  it("uses timezone rules at DST transitions", () => {
    expect(todayStr("America/New_York", new Date("2024-03-10T04:30:00.000Z"))).toBe(
      "2024-03-09"
    );
    expect(todayStr("America/New_York", new Date("2024-03-10T05:30:00.000Z"))).toBe(
      "2024-03-10"
    );
  });

  it("adds and subtracts calendar days across month, leap-day, and year boundaries", () => {
    expect(addCalendarDays("2023-01-31", 1)).toBe("2023-02-01");
    expect(addCalendarDays("2024-03-01", -1)).toBe("2024-02-29");
    expect(addCalendarDays("2024-12-31", 1)).toBe("2025-01-01");
    expect(daysAgoStr(1, "Africa/Lagos", new Date("2024-01-01T23:30:00.000Z"))).toBe(
      "2024-01-01"
    );
  });

  it("formats date-only values independently of the runtime timezone", () => {
    const dateKey = "2024-01-01";
    expect(formatDateKey(dateKey, { weekday: "long", month: "long", day: "numeric" })).toBe(
      "Monday, January 1"
    );
    expect(formatDateKey(dateKey, { year: "numeric", month: "2-digit", day: "2-digit" })).toBe(
      "01/01/2024"
    );
  });

  it("keeps selection, storage validation, and displayed date on the same key", () => {
    const selectedDate = dateKeyFromInstant(
      new Date("2024-01-01T23:30:00.000Z"),
      "Africa/Lagos"
    );
    expect(selectedDate).toBe("2024-01-02");
    expect(() => assertDateKey(selectedDate)).not.toThrow();
    expect(formatDateKey(selectedDate, { weekday: "short", month: "short", day: "numeric" })).toBe(
      "Tue, Jan 2"
    );
  });

  it("rejects invalid date keys and non-integer calendar offsets", () => {
    for (const value of ["2024-02-30", "2024-2-01", "not-a-date", "0000-01-01"]) {
      expect(isValidDateKey(value)).toBe(false);
      expect(() => assertDateKey(value)).toThrow(RangeError);
    }
    expect(() => addCalendarDays("2024-01-01", 1.5)).toThrow(RangeError);
  });

  it("requires a valid saved IANA timezone", () => {
    expect(isValidTimeZone(undefined)).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(() => assertValidTimeZone(undefined)).toThrow(RangeError);
    expect(() => todayStr("Mars/Olympus", new Date("2024-01-01T00:00:00.000Z"))).toThrow(
      RangeError
    );
  });
});
