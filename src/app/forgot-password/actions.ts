"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/siteUrl";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) {
    redirect(`/forgot-password?error=${encodeURIComponent("Enter your email address.")}`);
  }

  const supabase = await createClient();
  let errorMessage: string | undefined;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
    });
    errorMessage = error?.message;
  } catch (cause) {
    console.error("Supabase password reset request failed", cause);
    errorMessage = "Unable to reach the authentication service. Please try again.";
  }

  if (errorMessage) {
    redirect(`/forgot-password?error=${encodeURIComponent(errorMessage)}`);
  }

  redirect("/forgot-password?sent=1");
}
