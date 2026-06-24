import type { CSSProperties } from "react";
import { Source_Sans_3 } from "next/font/google";

// Shared dashboard font — Source Sans Pro (Google's current "Source Sans 3").
// Imported by the admin, confirmateur (/confirmation) and technician (/technicien)
// layouts so all three role dashboards share ONE typography pattern.
// The public storefront is intentionally left on the global Roboto.
export const dashboardFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-source",
  display: "swap",
});

// Spread onto a dashboard's root element. Sets the real font-family (so every
// inheriting element switches) AND remaps --font-sans / --font-display (so even
// elements using the `font-sans` / `font-display` utilities switch too).
export const dashboardFontStyle = {
  fontFamily: "var(--font-source)",
  "--font-sans": "var(--font-source)",
  "--font-display": "var(--font-source)",
} as CSSProperties;
