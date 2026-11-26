import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  InvalidPushEndpointError,
  UnsafePushAddressError,
  sendValidatedPushNotification,
} from "@/lib/pushEndpoint";
import { isValidTimeZone } from "@/lib/date";
import { localParts, timeToMinutes } from "@/lib/reminderScheduling";

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
  const timezoneByUser = new Map<string, string>();
  for (const profile of profiles ?? []) {
    const { id, timezone } = profile as { id: string; timezone: string | null };
    if (!isValidTimeZone(timezone)) {
      return NextResponse.json({ error: "A profile has a missing or invalid timezone" }, { status: 500 });
    }
    timezoneByUser.set(id, timezone);
  }
  if (userIds.some((userId) => !timezoneByUser.has(userId))) {
    return NextResponse.json({ error: "A reminder owner has no profile timezone" }, { status: 500 });
  }

  const due = (reminders as ReminderRow[]).filter((r) => {
    const local = localParts(timezoneByUser.get(r.user_id)!, now);
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
  let failed = 0;
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
            await sendValidatedPushNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload
            );
            sent += 1;
          } catch (err) {
            failed += 1;
            if (
              err instanceof InvalidPushEndpointError ||
              err instanceof UnsafePushAddressError
            ) {
              staleSubIds.push(sub.id);
            }
            const statusCode = (err as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
              staleSubIds.push(sub.id);
            }
          }
        })
      );

      const timeZone = timezoneByUser.get(reminder.user_id)!;
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
    failed,
    cleaned: staleSubIds.length,
  });
}
