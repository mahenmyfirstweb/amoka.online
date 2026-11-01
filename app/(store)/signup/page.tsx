import type { Metadata } from "next";
import { SignupForm } from "@/components/store/auth-forms";
import { safeRedirectPath } from "@/lib/format";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create an amoka.online account.",
  robots: { index: false },
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-5 text-2xl">Create an account</h1>
      <SignupForm next={safeRedirectPath(next)} />
    </div>
  );
}
