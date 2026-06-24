"use client";

import { Pencil, Trash2 } from "lucide-react";
import { getCategoryBySlug } from "@/lib/mock-data";
import { deleteProductAction } from "@/lib/product-actions";
import { ProductPhoto } from "@/components/product-photo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/admin/data-table";
import { formatMAD } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-context";
import type { Product } from "@/lib/types";

export function ProductsTable({ products }: { products: Product[] }) {
  const { t } = useI18n();

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: t("admin.productsPage.colProduct"),
      sort: (p) => p.name,
      cell: (p) => (
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border bg-card">
            <ProductPhoto src={p.images[0]} alt={p.name} hue={p.hue} sizes="44px" className="p-0.5" />
          </div>
          <div className="min-w-0">
            <p dir="auto" className="line-clamp-1 font-semibold text-ink">{p.name}</p>
            <p className="text-xs text-ink-soft">
              {p.stages ? t("admin.productsPage.stages", { count: p.stages }) : p.capacity ?? "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: t("admin.productsPage.colCategory"),
      cell: (p) => {
        const cat = getCategoryBySlug(p.categorySlug);
        return (
          <Badge className="border border-border bg-muted/50 text-muted-foreground">
            {cat ? t(`cat.${cat.slug}.name`) : p.categorySlug}
          </Badge>
        );
      },
    },
    {
      key: "price",
      header: t("admin.productsPage.colPrice"),
      sort: (p) => p.price,
      cell: (p) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-ink">{formatMAD(p.price)}</span>
          {p.oldPrice && (
            <>
              <span className="text-xs text-ink-soft line-through">{formatMAD(p.oldPrice)}</span>
              <Badge className="border-rose-100 bg-rose-50 text-rose-600">
                -{Math.round((1 - p.price / p.oldPrice) * 100)}%
              </Badge>
            </>
          )}
        </div>
      ),
    },
    {
      key: "stock",
      header: t("admin.productsPage.colStock"),
      sort: (p) => p.stock,
      cell: (p) => (
        <Badge
          className={
            p.stock <= 5
              ? "gap-1.5 border-rose-100 bg-rose-100 text-rose-700"
              : p.stock <= 10
                ? "gap-1.5 border-amber-100 bg-amber-100 text-amber-700"
                : "gap-1.5 border-border bg-muted text-muted-foreground"
          }
        >
          {p.stock <= 10 && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
          {p.stock}
        </Badge>
      ),
    },
    {
      key: "status",
      header: t("admin.productsPage.colStatus"),
      cell: (p) =>
        p.inStock ? (
          <Badge className="gap-1.5 bg-emerald-100 text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t("admin.productsPage.inStock")}
          </Badge>
        ) : (
          <Badge className="bg-rose-100 text-rose-700">{t("admin.productsPage.outOfStock")}</Badge>
        ),
    },
    {
      key: "actions",
      header: t("admin.productsPage.colActions"),
      headClassName: "text-end",
      className: "text-end",
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            href={`/admin/products/${p.id}/edit`}
            variant="ghost"
            size="icon-sm"
            className="rounded-lg text-ink-soft hover:bg-brand-50 hover:text-brand-600"
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">{t("admin.productsPage.edit")}</span>
          </Button>
          <form action={deleteProductAction.bind(null, p.id)}>
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              className="rounded-lg text-ink-soft hover:bg-rose-50 hover:text-rose-500"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">{t("admin.productsPage.delete")}</span>
            </Button>
          </form>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      rows={products}
      columns={columns}
      getRowId={(p) => p.id}
      search={(p) => `${p.name} ${p.categorySlug}`}
      searchPlaceholder={t("admin.productsPage.searchPlaceholder")}
      csv={{
        filename: "products.csv",
        row: (p) => ({
          Name: p.name,
          Category: p.categorySlug,
          Price: p.price,
          Stock: p.stock,
          Status: p.inStock ? "in_stock" : "out_of_stock",
        }),
      }}
      defaultSortKey="name"
      defaultSortDir="asc"
      emptyText={t("admin.productsPage.empty")}
      minWidth="min-w-[820px]"
    />
  );
}
