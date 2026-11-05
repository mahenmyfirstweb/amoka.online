"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { site } from "@/config/site";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { passwordSchema } from "@/lib/validation";

const NOT_CONFIGURED = "Sign-in isn't set up yet. Add your Supabase keys first.";

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={props.name} className="mb-1 block text-sm font-medium">{label}</label>
      <input id={props.name} required className="input" {...props} />
    </div>
  );
}

function Message({ error, notice }: { error?: string | null; notice?: string | null }) {
  if (error) return <p role="alert" className="rounded-lg bg-beige-tint p-3 text-sm font-medium text-bark">{error}</p>;
  if (notice) return <p role="status" className="rounded-lg bg-beige-tint p-3 text-sm">{notice}</p>;
  return null;
}

function useSubmit(action: (form: FormData) => Promise<void>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!isSupabaseConfigured) {
      setError(NOT_CONFIGURED);
      return;
    }
    setPending(true);
    try {
      await action(new FormData(event.currentTarget));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return { pending, error, onSubmit };
}

export function LoginForm({ next, admin = false }: { next: string; admin?: boolean }) {
  const router = useRouter();
  const { pending, error, onSubmit } = useSubmit(async (form) => {
    const { error: authError } = await createClient().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (authError) throw new Error("Wrong email or password, or your email isn't confirmed yet.");
    router.push(next);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Message error={error} />
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <Field label="Password" name="password" type="password" autoComplete="current-password" />
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Signing in..." : "Sign in"}
      </button>
      <p className="flex justify-between text-sm">
        <Link href="/forgot-password" className="underline underline-offset-2">Forgot password?</Link>
        {!admin && (
          <Link href={`/signup?next=${encodeURIComponent(next)}`} className="underline underline-offset-2">Create an account</Link>
        )}
      </p>
    </form>
  );
}

export function SignupForm({ next }: { next: string }) {
  const [notice, setNotice] = useState<string | null>(null);
  const { pending, error, onSubmit } = useSubmit(async (form) => {
    const password = passwordSchema.safeParse(form.get("password"));
    if (!password.success) throw new Error(password.error.issues[0].message);

    const { error: authError } = await createClient().auth.signUp({
      email: String(form.get("email")),
      password: password.data,
      options: {
        data: { full_name: String(form.get("full_name")) },
        emailRedirectTo: `${site.url}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (authError) throw new Error(authError.message);
    setNotice("Almost done. Check your email and click the link to confirm your account.");
  });

  if (notice) return <Message notice={notice} />;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Message error={error} />
      <Field label="Full name" name="full_name" autoComplete="name" />
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <Field label="Password (at least 8 characters)" name="password" type="password" autoComplete="new-password" minLength={8} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Creating account..." : "Create account"}
      </button>
      <p className="text-sm">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="underline underline-offset-2">Sign in</Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [notice, setNotice] = useState<string | null>(null);
  const { pending, error, onSubmit } = useSubmit(async (form) => {
    await createClient().auth.resetPasswordForEmail(String(form.get("email")), {
      redirectTo: `${site.url}/auth/callback?next=/reset-password`,
    });
    // Same message either way, so this form can't reveal who has an account.
    setNotice("If that email has an account, a reset link is on its way.");
  });

  if (notice) return <Message notice={notice} />;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Message error={error} />
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Sending..." : "Send reset link"}
      </button>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const { pending, error, onSubmit } = useSubmit(async (form) => {
    const password = passwordSchema.safeParse(form.get("password"));
    if (!password.success) throw new Error(password.error.issues[0].message);

    const { error: authError } = await createClient().auth.updateUser({ password: password.data });
    if (authError) throw new Error(authError.message);
    router.push("/account");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Message error={error} />
      <Field label="New password (at least 8 characters)" name="password" type="password" autoComplete="new-password" minLength={8} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Saving..." : "Save password"}
      </button>
    </form>
  );
}

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="btn btn-outline"
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
