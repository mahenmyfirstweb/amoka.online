import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/store/invoice-document";
import { PrintButton } from "@/components/store/print-button";
import { getOrder } from "@/lib/orders";

export const metadata: Metadata = { title: "Invoice", robots: { index: false } };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getOrder(id);
  if (!result || !result.order.paid_at || result.order.status === "cancelled") notFound();

  return (
    <div className="space-y-4">
      <InvoiceDocument order={result.order} items={result.items} />
      <PrintButton />
    </div>
  );
}
