"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (!password || password !== confirmPassword) {
    redirect(`/reset-password?error=${encodeURIComponent("Passwords do not match.")}`);
  }

  const supabase = await createClient();
  let errorMessage: string | undefined;
  try {
    const { error } = await supabase.auth.updateUser({ password });
    errorMessage = error?.message;
  } catch (cause) {
    console.error("Supabase password update failed", cause);
    redirect(
      `/reset-password?error=${encodeURIComponent("Unable to reach the authentication service. Please try again.")}`
    );
  }

  if (errorMessage) {
    redirect(`/reset-password?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
