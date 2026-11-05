"use client";

import { useActionState } from "react";
import { updateOrderStatus, type ActionState } from "@/app/admin/actions";
import { STATUS_LABELS } from "@/components/store/order-labels";
import { NEXT_STATUSES, type OrderStatus, type PaymentMethod } from "@/lib/validation";

export function OrderStatusForm({ orderId, status, paymentMethod }: {
  orderId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateOrderStatus, {});
  const next = NEXT_STATUSES[status];

  if (next.length === 0) return <p className="text-sm">This order is {STATUS_LABELS[status].toLowerCase()}. No further changes.</p>;

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={orderId} />
      {state.error && <p role="alert" className="text-sm font-medium text-bark">{state.error}</p>}
      {state.saved && <p role="status" className="text-sm">Status updated.</p>}
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="new-status" className="mb-1 block text-sm">Change status to</label>
          <select id="new-status" name="status" className="input w-48">
            {next.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Updating..." : "Update"}</button>
      </div>
      {next.includes("cancelled") && (
        <p className="text-sm">
          {paymentMethod === "pay_later" && status === "pending"
            ? "Cancelling returns the stock."
            : "Cancelling returns the stock. It doesn't refund the customer: refund online payments in your Stripe dashboard."}
        </p>
      )}
    </form>
  );
}
