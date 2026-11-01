"use client";

import { useActionState } from "react";
import { updateProfile, type FormState } from "@/app/(store)/account/actions";

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, {});

  return (
    <form action={action} className="max-w-sm space-y-3">
      {state.error && <p role="alert" className="rounded-lg bg-beige-tint p-3 text-sm font-medium text-bark">{state.error}</p>}
      {state.saved && <p role="status" className="rounded-lg bg-beige-tint p-3 text-sm">Saved.</p>}
      <div>
        <label htmlFor="full_name" className="mb-1 block text-sm font-medium">Full name</label>
        <input id="full_name" name="full_name" required defaultValue={fullName} autoComplete="name" className="input" />
      </div>
      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium">Phone</label>
        <input id="phone" name="phone" defaultValue={phone} autoComplete="tel" inputMode="tel" className="input" />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Saving..." : "Save"}</button>
    </form>
  );
}
