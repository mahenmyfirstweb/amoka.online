import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { LoginForm, SignOutButton } from "@/components/store/auth-forms";
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
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-beige-tint">
            <LockKeyhole aria-hidden="true" size={26} />
          </span>
          <p className="mt-4 font-heading text-2xl font-bold">
            amoka<span className="font-semibold italic">.online</span>
          </p>
          <h1 className="mt-1 font-sans text-sm font-semibold tracking-[0.18em] uppercase">Admin console</h1>
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
