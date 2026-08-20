import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// How far back (in minutes) a due-but-unsent reminder is still fired. Must
// be >= the cron's actual polling interval, or a reminder between two ticks
// gets skipped entirely. 10 min comfortably covers a 1-5 min cron schedule.
const GRACE_MINUTES = 10;

interface ReminderRow {
  id: string;
  user_id: string;
  time: string; // "HH:MM"
  label: string;
  last_sent_date: string | null;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function localParts(timeZone: string, now: Date): { date: string; minutes: number } {
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

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return NextResponse.json({ error: "Push is not configured" }, { status: 500 });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabase = createAdminClient();
  const now = new Date();

  const { data: reminders, error: remindersError } = await supabase
    .from("reminders")
    .select("id, user_id, time, label, last_sent_date")
    .eq("enabled", true);
  if (remindersError) {
    return NextResponse.json({ error: remindersError.message }, { status: 500 });
  }
  if (!reminders || reminders.length === 0) {
    return NextResponse.json({ checked: 0, due: 0, sent: 0 });
  }

  const userIds = [...new Set((reminders as ReminderRow[]).map((r) => r.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, timezone")
    .in("id", userIds);
  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }
  const timezoneByUser = new Map<string, string>(
    (profiles ?? []).map((p) => [p.id as string, (p.timezone as string) || "Africa/Lagos"])
  );

  const due = (reminders as ReminderRow[]).filter((r) => {
    const timeZone = timezoneByUser.get(r.user_id) ?? "Africa/Lagos";
    let local;
    try {
      local = localParts(timeZone, now);
    } catch {
      local = localParts("Africa/Lagos", now);
    }
    if (r.last_sent_date === local.date) return false;
    const diff = local.minutes - timeToMinutes(r.time);
    return diff >= 0 && diff < GRACE_MINUTES;
  });

  if (due.length === 0) {
    return NextResponse.json({ checked: reminders.length, due: 0, sent: 0 });
  }

  const dueUserIds = [...new Set(due.map((r) => r.user_id))];
  const { data: subscriptions, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", dueUserIds);
  if (subsError) {
    return NextResponse.json({ error: subsError.message }, { status: 500 });
  }

  const subsByUser = new Map<string, SubscriptionRow[]>();
  for (const sub of (subscriptions ?? []) as SubscriptionRow[]) {
    const list = subsByUser.get(sub.user_id) ?? [];
    list.push(sub);
    subsByUser.set(sub.user_id, list);
  }

  let sent = 0;
  const staleSubIds: string[] = [];

  await Promise.all(
    due.map(async (reminder) => {
      const subs = subsByUser.get(reminder.user_id) ?? [];
      const payload = JSON.stringify({
        title: "Calorie Tracker",
        body: reminder.label,
        tag: reminder.id,
      });

      await Promise.all(
        subs.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload
            );
            sent += 1;
          } catch (err) {
            const statusCode = (err as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
              staleSubIds.push(sub.id);
            }
          }
        })
      );

      const timeZone = timezoneByUser.get(reminder.user_id) ?? "Africa/Lagos";
      const local = localParts(timeZone, now);
      await supabase
        .from("reminders")
        .update({ last_sent_date: local.date })
        .eq("id", reminder.id);
    })
  );

  if (staleSubIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleSubIds);
  }

  return NextResponse.json({
    checked: reminders.length,
    due: due.length,
    sent,
    cleaned: staleSubIds.length,
  });
}
