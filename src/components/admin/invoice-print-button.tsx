"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Print button for the PUBLIC facture page. Label is passed in (the public route has no
 * i18n provider), so this stays a pure shadcn Button with no useI18n dependency.
 */
export function InvoicePrintButton({ label }: { label: string }) {
  return (
    <Button onClick={() => window.print()} variant="primary" size="sm" className="gap-2">
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}
