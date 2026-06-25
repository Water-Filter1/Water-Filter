import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/cart-context";
import { Toaster } from "@/components/ui/sonner";

// Classic Roboto (fixed weights) — used for both body and headings across the site.
// Static weights keep strokes consistent + readable at small sizes (unlike Roboto Flex,
// whose optical-size axis thins out small text).
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Filtre Maroc — Filtres à eau & osmose inverse au Maroc",
    template: "%s | Filtre Maroc",
  },
  description:
    "Filtres à eau, systèmes d'osmose inverse, fontaines et solutions semi-industrielles. Livraison partout au Maroc. Paiement à la livraison.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${roboto.variable} h-full`}
    >
      <body
        suppressHydrationWarning
        className="flex min-h-screen flex-col bg-white text-ink antialiased"
      >
        <CartProvider>{children}</CartProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
