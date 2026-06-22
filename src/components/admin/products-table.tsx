"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { getCategoryBySlug } from "@/lib/mock-data";
import { deleteProductAction } from "@/lib/product-actions";
import { ProductPhoto } from "@/components/product-photo";
import { SearchInput } from "@/components/admin/search-input";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatMAD } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-context";
import type { Product } from "@/lib/types";

export function ProductsTable({ products }: { products: Product[] }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(s) || p.categorySlug.toLowerCase().includes(s),
    );
  }, [products, q]);

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="border-b border-slate-200 p-4">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={t("admin.productsPage.searchPlaceholder")}
          className="max-w-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.productsPage.colProduct")}</TableHead>
              <TableHead>{t("admin.productsPage.colCategory")}</TableHead>
              <TableHead>{t("admin.productsPage.colPrice")}</TableHead>
              <TableHead>{t("admin.productsPage.colStock")}</TableHead>
              <TableHead>{t("admin.productsPage.colStatus")}</TableHead>
              <TableHead className="text-end">{t("admin.productsPage.colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center text-ink-soft">
                  {t("admin.productsPage.empty")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const cat = getCategoryBySlug(p.categorySlug);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <ProductPhoto src={p.images[0]} alt={p.name} hue={p.hue} sizes="44px" className="p-0.5" />
                        </div>
                        <div className="min-w-0">
                          <p dir="auto" className="line-clamp-1 font-medium text-ink">{p.name}</p>
                          <p className="text-xs text-ink-soft">
                            {p.stages ? t("admin.productsPage.stages", { count: p.stages }) : p.capacity ?? "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-ink-soft">{cat ? t(`cat.${cat.slug}.name`) : p.categorySlug}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-ink">{formatMAD(p.price)}</span>
                      {p.oldPrice && (
                        <span className="ml-1 text-xs text-ink-soft line-through">{formatMAD(p.oldPrice)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={p.stock <= 10 ? "font-semibold text-amber-600" : "text-ink"}>{p.stock}</span>
                    </TableCell>
                    <TableCell>
                      {p.inStock ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {t("admin.productsPage.inStock")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                          {t("admin.productsPage.outOfStock")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/products/${p.id}/edit`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-600"
                          aria-label={t("admin.productsPage.edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <form action={deleteProductAction.bind(null, p.id)}>
                          <button
                            type="submit"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-rose-50 hover:text-rose-500"
                            aria-label={t("admin.productsPage.delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
