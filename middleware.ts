import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./lib/supabase/env";

const intl = createIntlMiddleware(routing);

const ADMIN_LOGIN = "/admin/prisijungimas";

/**
 * Public site → next-intl (locale routing). Admin → Supabase session refresh and a
 * login gate (pages still check the staff role on the server; RLS has the last word).
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return adminSession(request);
  return intl(request);
}

async function adminSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() validates the token with Supabase Auth and refreshes it when needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = request.nextUrl.pathname.startsWith(ADMIN_LOGIN);
  if (!user && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_LOGIN;
    url.search = "";
    if (request.nextUrl.pathname !== "/admin") url.searchParams.set("next", request.nextUrl.pathname);
    return withCookies(NextResponse.redirect(url), response);
  }
  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return withCookies(NextResponse.redirect(url), response);
  }
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

/** Keep refreshed auth cookies on redirects too. */
function withCookies(redirect: NextResponse, from: NextResponse) {
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  // Everything except API routes, Next / Vercel internals and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
