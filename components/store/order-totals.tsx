import { formatPrice, formatRate } from "@/lib/format";

export function OrderTotals({ subtotal, shipping, total, gst, gstRateBp }: {
  subtotal: number;
  shipping: number;
  total: number;
  gst: number;
  gstRateBp: number;
}) {
  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex justify-between">
        <dt>Subtotal</dt>
        <dd>{formatPrice(subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt>Shipping</dt>
        <dd>{shipping === 0 ? "Free" : formatPrice(shipping)}</dd>
      </div>
      <div className="flex justify-between border-t border-beige pt-2 text-base font-semibold text-bark">
        <dt>Total</dt>
        <dd>{formatPrice(total)}</dd>
      </div>
      {gstRateBp > 0 && (
        <div className="flex justify-between">
          <dt>Includes {formatRate(gstRateBp)} GST</dt>
          <dd>{formatPrice(gst)}</dd>
        </div>
      )}
    </dl>
  );
}
