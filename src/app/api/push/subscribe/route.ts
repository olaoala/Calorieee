import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  InvalidPushEndpointError,
  validatePushEndpoint,
} from "@/lib/pushEndpoint";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const endpoint: unknown = body?.endpoint;
  const p256dh: string | undefined = body?.p256dh;
  const auth: string | undefined = body?.auth;
  if (typeof p256dh !== "string" || !p256dh || typeof auth !== "string" || !auth) {
    return NextResponse.json({ error: "Missing subscription fields" }, { status: 400 });
  }

  let validatedEndpoint: URL;
  try {
    validatedEndpoint = validatePushEndpoint(endpoint);
  } catch (error) {
    if (error instanceof InvalidPushEndpointError) {
      return NextResponse.json({ error: "Unsupported push endpoint" }, { status: 400 });
    }
    throw error;
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint: validatedEndpoint.href, p256dh, auth },
      { onConflict: "endpoint" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
