import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh + route guard.
 *
 * Named `proxy.ts` rather than `middleware.ts`: Next 16 renamed the convention,
 * and `middleware.ts` now logs a deprecation warning on every build.
 *
 * Refreshes the Supabase auth session on every request. Server Components
 * cannot write cookies, so without this the access token quietly expires and
 * the user appears signed out on the next navigation.
 *
 * If Supabase env vars are absent this becomes a pass-through, so the
 * storefront still runs before the backend is wired up.
 */
export default async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Must be called before the response is returned or the token may not refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, searchParams } = request.nextUrl;

  if (!user && pathname.startsWith("/account")) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.search = "";
    redirect.searchParams.set("next", pathname);
    return NextResponse.redirect(redirect);
  }

  // A signed-in user has no business on the login screen.
  if (user && pathname === "/login") {
    const redirect = request.nextUrl.clone();
    redirect.pathname = searchParams.get("next") ?? "/account";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimisation, which never need
     * an auth check and would only add latency.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
