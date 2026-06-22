"use client";

import { IconContext } from "@phosphor-icons/react";

/**
 * Defaults every Phosphor icon in the subtree to the "duotone" weight
 * (premium two-tone look). Individual icons can still override via `weight`.
 */
export function IconProvider({ children }: { children: React.ReactNode }) {
  return <IconContext.Provider value={{ weight: "duotone" }}>{children}</IconContext.Provider>;
}
