import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { site } from "@/config/site";

type Policy = { title: string; description: string; sections: [string, string][] };

const POLICIES: Record<string, Policy> = {
  shipping: {
    title: "Shipping policy",
    description: "How and when amoka.online delivers within Singapore.",
    sections: [
      ["Where we deliver", "We deliver to addresses in Singapore only."],
      ["Delivery time", `Orders usually arrive within ${site.deliveryTime} after payment is confirmed. For pay-later orders, we'll agree delivery with you when we arrange payment.`],
      ["Shipping charges", "Shipping charges are shown in your cart and at checkout before you pay. Orders above our free shipping amount ship free."],
      ["Failed deliveries", `Please check your address and phone number at checkout. If a delivery can't be completed, contact us at ${site.email} and we'll arrange the next step.`],
    ],
  },
  refunds: {
    title: "Refund and returns policy",
    description: "How refunds and returns work at amoka.online.",
    sections: [
      ["Damaged or wrong items", `If an item arrives damaged, spoiled or isn't what you ordered, contact us within ${site.returnWindow} of delivery with your order number and a photo. We'll replace it or refund you.`],
      ["Food items", "For food safety, we can't accept returns of opened food unless it was faulty."],
      ["Cancelling an order", `Contact us at ${site.email} as soon as possible. We can cancel orders that haven't shipped.`],
      ["How refunds are paid", "Refunds go back to your original payment method. The time they take to appear depends on your bank or payment provider."],
    ],
  },
  privacy: {
    title: "Privacy policy",
    description: "How amoka.online collects and protects your personal data.",
    sections: [
      ["Who we are", `${site.legalName} (UEN ${site.uen}) runs ${site.name}. We handle personal data in line with Singapore's Personal Data Protection Act 2012 (PDPA).`],
      ["What we collect", "Your name, email, phone number, delivery addresses and order history, whether you order with an account or as a guest. Payments are handled by Stripe, so we never see or store your full card details."],
      ["Why we use it", "To process and deliver your orders, provide customer support, keep your account secure and meet our legal obligations."],
      ["Who we share it with", "Only the service providers needed to run the store: our payment provider, hosting and database providers, and delivery partners. We don't sell your data."],
      ["Your choices", `You can update your details in your account. To ask for access to, correction of or deletion of your data, or to withdraw consent, email ${site.email}.`],
      ["Cookies", "We use cookies that keep you signed in, and your browser stores your cart. We don't use advertising cookies."],
      ["Contact", `Contact our Data Protection Officer at ${site.email}.`],
    ],
  },
  terms: {
    title: "Terms and conditions",
    description: "The terms for shopping at amoka.online.",
    sections: [
      ["About these terms", `These terms apply when you buy from ${site.name}, operated by ${site.legalName} (UEN ${site.uen}), ${site.address}.`],
      ["Prices", "All prices are in Singapore dollars. The price and any GST are confirmed at checkout before you pay."],
      ["Orders", "If you pay online, your order is accepted once payment is confirmed. If you choose to pay later, we'll contact you to arrange payment, and we may cancel the order if payment can't be arranged. You don't need an account to order. If an item can't be supplied, we'll tell you and refund that item."],
      ["Product information", "We work to keep product details accurate. Always check the pack for ingredients and allergens before eating."],
      ["Governing law", "These terms are governed by the laws of Singapore."],
      ["Contact", `Email ${site.email} or call ${site.phone} (${site.supportHours}).`],
    ],
  },
};

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const policy = POLICIES[(await params).slug];
  return policy ? { title: policy.title, description: policy.description } : {};
}

export default async function PolicyPage({ params }: Props) {
  const policy = POLICIES[(await params).slug];
  if (!policy) notFound();

  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="mb-5 text-2xl sm:text-3xl">{policy.title}</h1>
      {policy.sections.map(([heading, text]) => (
        <section key={heading} className="mb-5">
          <h2 className="mb-1 text-lg">{heading}</h2>
          <p>{text}</p>
        </section>
      ))}
    </article>
  );
}
