"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function login(formData: FormData) {
  const cookieStore = await cookies();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const remember = formData.get("remember") === "on";

  cookieStore.set("caloriee-remember", remember ? "1" : "0", {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(remember ? { maxAge: 60 * 60 * 24 * 365 } : {}),
  });

  // Same client setup as lib/supabase/server.ts, but with a setAll() that
  // drops the cookie expiry when "remember me" is unchecked — that turns
  // the session cookie into a browser-session-only cookie instead of the
  // long-lived one Supabase sets by default.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const finalOptions = remember
                ? { ...options, maxAge: 60 * 60 * 24 * 365, expires: undefined }
                : { ...options, maxAge: undefined, expires: undefined };
              cookieStore.set(name, value, finalOptions);
            });
          } catch {
            // Called from a Server Component with no way to set cookies.
          }
        },
      },
    }
  );

  let error;
  try {
    ({ error } = await supabase.auth.signInWithPassword({ email, password }));
  } catch (cause) {
    console.error("Supabase login request failed", cause);
    redirect("/login?error=Unable%20to%20reach%20the%20authentication%20service.%20Please%20try%20again.");
  }

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
