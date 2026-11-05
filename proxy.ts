import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { site } from "@/config/site";
import { isSupabaseConfigured, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

// Checkout is open to guests, so it isn't listed.
const PROTECTED_PATHS = ["/account", "/admin"];

const VERCEL_PRODUCTION_HOST = "amoka-online.vercel.app";

// Keeps the login session fresh and sends signed-out visitors to the login page.
// This is only a convenience: real authorisation happens in pages, actions and RLS.
export async function proxy(request: NextRequest) {
  // Visitors on the old Vercel address go to the real domain, once NEXT_PUBLIC_SITE_URL is set
  // to it. Preview deployments use other vercel.app addresses and are left alone.
  const host = request.headers.get("host");
  const canonical = new URL(site.url);
  if (host === VERCEL_PRODUCTION_HOST && canonical.host !== host && !canonical.host.startsWith("localhost")) {
    const url = new URL(request.nextUrl.pathname + request.nextUrl.search, canonical);
    return NextResponse.redirect(url, 308);
  }

  if (!isSupabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const { data } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  if (!data.user && pathname !== "/admin/login" && PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/admin") ? "/admin/login" : "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:png|jpg|jpeg|webp|svg|ico)$).*)"],
};
