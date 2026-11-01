import { NextResponse } from "next/server";
import { site } from "@/config/site";
import { safeRedirectPath } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

// Email confirmation and password reset links land here.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"), "/account");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${site.url}${next}`);
  }

  return NextResponse.redirect(`${site.url}/login`);
}
