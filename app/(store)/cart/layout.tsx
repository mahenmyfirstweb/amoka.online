import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review the items in your cart.",
  robots: { index: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
