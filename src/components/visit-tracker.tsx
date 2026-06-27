"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * First-party analytics: fires one lightweight ping to /api/track on each storefront page
 * view (initial load + client-side route changes). Renders nothing. Fire-and-forget — never
 * blocks or affects the page.
 */
export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = JSON.stringify({
      path: pathname || window.location.pathname,
      referrer: document.referrer || "",
      search: window.location.search || "",
    });
    try {
      void fetch("/api/track", {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      });
    } catch {
      /* never break the page for analytics */
    }
  }, [pathname]);

  return null;
}
