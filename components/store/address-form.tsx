"use client";

import { useActionState } from "react";
import { saveAddress, type FormState } from "@/app/(store)/account/actions";
import type { Address } from "@/lib/types";

const FIELDS = [
  { name: "recipient_name", label: "Recipient name", autoComplete: "name", required: true },
  { name: "phone", label: "Phone (8 digits)", autoComplete: "tel-national", inputMode: "tel", required: true },
  { name: "street", label: "Block and street", autoComplete: "street-address", required: true },
  { name: "unit", label: "Unit number, e.g. #08-03 (if any)", autoComplete: "address-line2" },
  { name: "building", label: "Building name (if any)", autoComplete: "off" },
  { name: "postal_code", label: "Postal code", autoComplete: "postal-code", inputMode: "numeric", required: true },
  { name: "label", label: "Label, e.g. Home (optional)", autoComplete: "off" },
] as const;

export function AddressForm({ address, onSaved }: { address?: Address; onSaved?: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(async (previous, form) => {
    const result = await saveAddress(previous, form);
    if (result.saved) onSaved?.();
    return result;
  }, {});

  return (
    <form action={action} className="space-y-3">
      {address && <input type="hidden" name="id" value={address.id} />}
      {state.error && <p role="alert" className="rounded-lg bg-beige-tint p-3 text-sm font-medium text-bark">{state.error}</p>}
      {state.saved && !onSaved && <p role="status" className="rounded-lg bg-beige-tint p-3 text-sm">Address saved.</p>}

      {FIELDS.map((f) => (
        <div key={f.name}>
          <label htmlFor={`${address?.id ?? "new"}-${f.name}`} className="mb-1 block text-sm font-medium">{f.label}</label>
          <input
            id={`${address?.id ?? "new"}-${f.name}`}
            name={f.name}
            required={"required" in f}
            autoComplete={f.autoComplete}
            inputMode={"inputMode" in f ? f.inputMode : undefined}
            defaultValue={address?.[f.name] ?? ""}
            className="input"
          />
        </div>
      ))}

      <label className="flex min-h-12 items-center gap-2 text-sm">
        <input type="checkbox" name="is_default" defaultChecked={address?.is_default} className="h-5 w-5 accent-brown" />
        Use as my default address
      </label>

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Saving..." : "Save address"}
      </button>
    </form>
  );
}
