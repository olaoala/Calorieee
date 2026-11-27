import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSafeRedirectUrl } from "@/lib/safeRedirect";
import { getOtpVerificationType } from "@/lib/authCallback";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const verificationType = searchParams.get("type");
  const otpType = getOtpVerificationType(verificationType);
  const next = getSafeRedirectUrl(request.url, searchParams.get("next"));

  if (code || tokenHash) {
    const supabase = await createClient();
    const result = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : otpType
        ? await supabase.auth.verifyOtp({
            token_hash: tokenHash!,
            type: otpType,
          })
        : { error: true };

    if (!result.error) {
      return NextResponse.redirect(next);
    }
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", "auth-failed");
  return NextResponse.redirect(loginUrl);
}
