import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/store/invoice-document";
import { PrintButton } from "@/components/store/print-button";
import { getOrder } from "@/lib/orders";

export const metadata = { title: "Invoice" };

export default async function AdminInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getOrder(id);
  if (!result) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/orders/${id}`} className="text-sm underline underline-offset-2">Back to order</Link>
        <PrintButton label="Print invoice" />
      </div>
      {result.order.status === "cancelled" && (
        <p role="alert" className="no-print rounded-lg bg-beige-tint p-3 text-sm font-medium text-bark">This order is cancelled.</p>
      )}
      <InvoiceDocument order={result.order} items={result.items} />
    </div>
  );
}
