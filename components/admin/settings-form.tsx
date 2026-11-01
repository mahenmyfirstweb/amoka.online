"use client";

import { useActionState } from "react";
import { saveSettings, type ActionState } from "@/app/admin/actions";
import type { StoreSettings } from "@/lib/catalog";

const dollars = (cents: number) => (cents / 100).toFixed(2);

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSettings, {});

  return (
    <form action={action} className="max-w-md space-y-4">
      {state.error && <p role="alert" className="rounded-lg bg-beige-tint p-3 text-sm font-medium text-bark">{state.error}</p>}
      {state.saved && <p role="status" className="rounded-lg bg-beige-tint p-3 text-sm">Saved.</p>}

      <div>
        <label htmlFor="shipping_fee" className="mb-1 block text-sm font-medium">Shipping fee (S$)</label>
        <input id="shipping_fee" name="shipping_fee" inputMode="decimal" required defaultValue={dollars(settings.shipping_fee_cents)} className="input" />
      </div>
      <div>
        <label htmlFor="free_shipping_threshold" className="mb-1 block text-sm font-medium">Free shipping from (S$)</label>
        <input id="free_shipping_threshold" name="free_shipping_threshold" inputMode="decimal" required defaultValue={dollars(settings.free_shipping_threshold_cents)} className="input" />
      </div>
      <label className="flex min-h-12 items-center gap-2">
        <input type="checkbox" name="gst_registered" defaultChecked={settings.gst_registered} className="h-5 w-5 accent-brown" />
        GST-registered
      </label>
      <div>
        <label htmlFor="gst_rate" className="mb-1 block text-sm font-medium">GST rate (%)</label>
        <input id="gst_rate" name="gst_rate" inputMode="decimal" required defaultValue={dollars(settings.gst_rate_bp)} className="input" />
      </div>
      <div>
        <label htmlFor="gst_reg_no" className="mb-1 block text-sm font-medium">GST registration number</label>
        <input id="gst_reg_no" name="gst_reg_no" defaultValue={settings.gst_reg_no ?? ""} className="input" />
        <p className="mt-1 text-sm">Printed on tax invoices. Past orders keep the number they were sold under.</p>
      </div>
      <div>
        <label htmlFor="low_stock_threshold" className="mb-1 block text-sm font-medium">Low stock warning at</label>
        <input id="low_stock_threshold" name="low_stock_threshold" type="number" min={0} required defaultValue={settings.low_stock_threshold} className="input" />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Saving..." : "Save settings"}</button>
    </form>
  );
}
