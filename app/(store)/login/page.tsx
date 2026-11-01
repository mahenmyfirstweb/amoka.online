import type { Metadata } from "next";
import { LoginForm } from "@/components/store/auth-forms";
import { safeRedirectPath } from "@/lib/format";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your amoka.online account.",
  robots: { index: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-5 text-2xl">Sign in</h1>
      <LoginForm next={safeRedirectPath(next)} />
    </div>
  );
}
