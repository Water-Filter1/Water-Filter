"use client";

import { Globe, Check, ChevronDown } from "lucide-react";
import { LOCALES, LOCALE_META } from "@/i18n/config";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  const current = LOCALE_META[locale];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Langue"
        className={cn(
          "flex h-10 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-sm font-semibold text-ink transition-colors hover:bg-brand-50",
          className,
        )}
      >
        <Globe className="h-4 w-4 text-brand-500" />
        <span className="hidden sm:inline">{current.flag}</span>
        <span className="hidden uppercase md:inline">{locale}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-2xl p-1.5">
        {LOCALES.map((l) => {
          const meta = LOCALE_META[l];
          return (
            <DropdownMenuItem
              key={l}
              onClick={() => setLocale(l)}
              className={cn(
                "gap-2.5 rounded-xl px-3 py-2",
                l === locale ? "font-bold text-brand-700" : "text-ink",
              )}
            >
              <span className="text-base">{meta.flag}</span>
              <span className="flex-1 text-start">{meta.label}</span>
              {l === locale && <Check className="h-4 w-4 text-brand-500" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
