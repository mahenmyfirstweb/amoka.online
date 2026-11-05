import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Tamil, Playfair_Display } from "next/font/google";
import { CartProvider } from "@/components/store/cart-context";
import { site } from "@/config/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display" });
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-tamil", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name}: ${site.tagline}`, template: `%s | ${site.name}` },
  description: site.description,
  openGraph: {
    siteName: site.name,
    title: site.name,
    description: site.description,
    type: "website",
    locale: "en_SG",
    url: "/",
  },
  // The tab icon, home-screen icon and share image come from app/icon.png,
  // app/apple-icon.png and app/opengraph-image.png.
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#fbc62f" };

// Never prerender at build time: a build without Supabase keys would otherwise freeze
// an empty store, and account and admin pages must always check the session.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-SG" className={`${inter.variable} ${display.variable} ${tamil.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
