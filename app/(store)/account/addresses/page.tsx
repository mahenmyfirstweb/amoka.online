import { deleteAddress } from "../actions";
import { AddressForm } from "@/components/store/address-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Address } from "@/lib/types";

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const supabase = await createClient();
  const { data } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  const addresses = (data ?? []) as Address[];

  return (
    <>
      <h1 className="mb-4 text-2xl">Addresses</h1>

      {addresses.length > 0 && (
        <ul className="mb-8 space-y-3">
          {addresses.map((a) => (
            <li key={a.id} className="card p-4">
              <details>
                <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-2 text-sm">
                  <span className="font-semibold">{a.label ?? a.recipient_name}</span>
                  <span>{a.street}{a.unit ? `, ${a.unit}` : ""}, Singapore {a.postal_code}</span>
                  {a.is_default && <span className="badge">Default</span>}
                </summary>
                <div className="mt-3 space-y-3">
                  <AddressForm address={a} />
                  <form action={deleteAddress}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="btn btn-outline">Delete address</button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 text-lg">Add an address</h2>
      <div className="max-w-md"><AddressForm /></div>
    </>
  );
}
