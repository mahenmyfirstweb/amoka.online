import type { OrderStatus, PaymentMethod } from "@/lib/validation";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  online: "Pay online",
  pay_later: "Pay later",
};
