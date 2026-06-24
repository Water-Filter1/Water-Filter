import { Plus } from "lucide-react";
import { getProducts } from "@/lib/data";
import { ProductsTable } from "@/components/admin/products-table";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const { t } = await getT();
  const products = await getProducts();
  return (
    <div className="font-semibold">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{t("admin.productsPage.title")}</h1>
          <p className="text-sm text-ink-soft">
            {t("admin.productsPage.subtitle", { count: products.length })}
          </p>
        </div>
        <Button
          href="/admin/products/new"
          className="gap-2 font-semibold shadow-[var(--shadow-glow)] transition-all hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" /> {t("admin.productsPage.addProduct")}
        </Button>
      </div>

      <ProductsTable products={products} />
    </div>
  );
}
