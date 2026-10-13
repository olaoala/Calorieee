export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function localParts(timeZone: string, now: Date): { date: string; minutes: number } {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const hhmm = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  const [h, m] = hhmm.split(":").map(Number);
  return { date, minutes: h * 60 + m };
}

export function isReminderDue(
  now: Date,
  timeZone: string,
  reminderTime: string,
  lastSentDate: string | null,
  graceMinutes = 10
): boolean {
  const local = localParts(timeZone, now);
  if (lastSentDate === local.date) return false;

  const diff = local.minutes - timeToMinutes(reminderTime);
  return diff >= 0 && diff < graceMinutes;
}
