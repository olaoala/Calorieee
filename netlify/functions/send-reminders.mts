import type { Config } from "@netlify/functions";

// Netlify ignores vercel.json, so the reminder cron never ran on Netlify.
// This scheduled function replaces it: every 5 minutes (UTC) it calls the
// existing Next.js route, which checks CRON_SECRET and sends due reminders.
export default async () => {
  const siteUrl = Netlify.env.get("URL");
  const secret = Netlify.env.get("CRON_SECRET");

  if (!siteUrl || !secret) {
    console.error("send-reminders: URL or CRON_SECRET is not set; skipping run");
    return new Response("Not configured", { status: 500 });
  }

  const res = await fetch(`${siteUrl}/api/push/send-reminders`, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(25_000),
  });
  const body = await res.text();

  if (!res.ok) {
    console.error(`send-reminders: route returned ${res.status}: ${body.slice(0, 300)}`);
  } else {
    console.log(`send-reminders: ${body.slice(0, 300)}`);
  }
  return new Response(null, { status: res.ok ? 204 : 502 });
};

export const config: Config = {
  schedule: "*/5 * * * *",
};
