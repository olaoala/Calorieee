export const DEFAULT_TIME_ZONE = "Africa/Lagos";

export function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== "string" || timeZone.length === 0) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function assertValidTimeZone(timeZone: string | null | undefined): asserts timeZone is string {
  if (!isValidTimeZone(timeZone)) {
    throw new RangeError("A valid IANA timezone is required.");
  }
}

export function isValidDateKey(dateKey: unknown): dateKey is string {
  if (typeof dateKey !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    year >= 1 &&
    year <= 9999 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function assertDateKey(dateKey: string): void {
  if (!isValidDateKey(dateKey)) {
    throw new RangeError(`Invalid calendar date key: ${dateKey}`);
  }
}

export function dateKeyFromInstant(instant: Date, timeZone: string): string {
  assertValidTimeZone(timeZone);
  if (!Number.isFinite(instant.getTime())) {
    throw new RangeError("A valid instant is required.");
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  if (!year || !month || !day) {
    throw new RangeError("Could not convert instant to a calendar date.");
  }

  const dateKey = `${year.padStart(4, "0")}-${month}-${day}`;
  assertDateKey(dateKey);
  return dateKey;
}

export function todayStr(timeZone: string, now = new Date()): string {
  return dateKeyFromInstant(now, timeZone);
}

export function addCalendarDays(dateKey: string, days: number): string {
  assertDateKey(dateKey);
  if (!Number.isInteger(days)) {
    throw new RangeError("Calendar-day offset must be an integer.");
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day + days);
  const result = [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
  assertDateKey(result);
  return result;
}

export function daysAgoStr(n: number, timeZone: string, now = new Date()): string {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError("Days ago must be a non-negative integer.");
  }
  return addCalendarDays(todayStr(timeZone, now), -n);
}

export function formatDateKey(
  dateKey: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
  locale = "en-US"
): string {
  assertDateKey(dateKey);
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return new Intl.DateTimeFormat(locale, {
    ...options,
    calendar: "gregory",
    timeZone: "UTC",
  }).format(date);
}
