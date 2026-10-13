import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function updateSession(request: NextRequest) {
  // API routes authenticate themselves (session cookie for user-scoped
  // routes, a bearer secret for the cron-triggered reminders route) — the
  // cron in particular has no browser session, so it must not be caught by
  // the redirect-to-/login logic below.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const remember = request.cookies.get("caloriee-remember")?.value === "1";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            const finalOptions = remember
              ? options
              : { ...options, maxAge: undefined, expires: undefined };
            response.cookies.set(name, value, finalOptions);
          });
        },
      },
    }
  );

  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    console.error("Supabase session request failed", error);
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "Unable to verify your session. Please try again.");
    return NextResponse.redirect(url);
  }

  const publicPaths = ["/login", "/signup", "/auth/callback"];
  const isPublic = publicPaths.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
