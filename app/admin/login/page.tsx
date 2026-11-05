import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { LoginForm, SignOutButton } from "@/components/store/auth-forms";
import { LogoImage } from "@/components/store/logo";
import { getIsAdmin, getUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false },
};

// The admin console's own entrance, separate from the shop's sign-in page.
export default async function AdminLoginPage() {
  const user = await getUser();
  if (user && (await getIsAdmin())) redirect("/admin");

  return (
    <main className="flex flex-1 items-center justify-center bg-bark px-4 py-12">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <LogoImage height={88} priority className="mx-auto h-[88px] w-auto" />
          <h1 className="mt-3 flex items-center justify-center gap-2 font-sans text-sm font-semibold tracking-[0.18em] uppercase">
            <LockKeyhole aria-hidden="true" size={16} /> Admin console
          </h1>
        </div>

        {user ? (
          <div className="space-y-4 text-center">
            <p role="alert" className="rounded-lg bg-beige-tint p-3 text-sm font-medium text-bark">
              {user.email} isn&apos;t an admin account. Sign out, then sign in with an admin account.
            </p>
            <SignOutButton />
          </div>
        ) : (
          <LoginForm next="/admin" admin />
        )}

        <p className="mt-6 text-center text-sm">
          <Link href="/" className="underline underline-offset-2">Back to the shop</Link>
        </p>
      </div>
    </main>
  );
}
