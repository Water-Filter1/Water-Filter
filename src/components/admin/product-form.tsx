"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { ArrowLeft, ImagePlus, Save, X, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CATEGORIES } from "@/lib/mock-data";
import { ProductPhoto } from "@/components/product-photo";
import { StarRating } from "@/components/star-rating";
import { Badge, toneForBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMAD, cn } from "@/lib/utils";
import { saveProductAction } from "@/lib/product-actions";
import type { Product } from "@/lib/types";
import { useI18n } from "@/i18n/i18n-context";

const BADGES = ["Best Seller", "Promo", "Nouveau"];

const fieldCls = "h-11 rounded-xl";
const labelCls = "mb-1.5 font-semibold text-ink";

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <Button type="submit" disabled={pending} className="h-12 w-full gap-2 font-semibold">
      <Save className="h-5 w-5" /> {pending ? t("admin.productForm.saving") : t("admin.productForm.save")}
    </Button>
  );
}

type ImgItem =
  | { id: string; kind: "existing"; url: string }
  | { id: string; kind: "new"; file: File; url: string };

/** A draggable product-image thumbnail (drag to reorder; first = cover). */
function SortableThumb({
  item,
  isCover,
  coverLabel,
  onRemove,
}: {
  item: ImgItem;
  isCover: boolean;
  coverLabel: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative aspect-square cursor-grab touch-none overflow-hidden rounded-xl border border-line bg-card active:cursor-grabbing",
        isDragging && "z-10 opacity-80 shadow-lg",
      )}
      {...attributes}
      {...listeners}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.url} alt="" className="pointer-events-none h-full w-full object-contain p-1" />
      <GripVertical className="absolute bottom-1 start-1 h-4 w-4 text-ink-soft opacity-0 transition group-hover:opacity-100" />
      {isCover && (
        <Badge className="absolute start-1 top-1 bg-ink/80 px-1.5 py-0 text-[10px] font-semibold text-white">
          {coverLabel}
        </Badge>
      )}
      <span
        className="absolute end-1 top-1"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="dark"
          size="icon-sm"
          onClick={onRemove}
          className="size-6 rounded-full p-0 opacity-0 transition group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
          <span className="sr-only">Supprimer</span>
        </Button>
      </span>
    </div>
  );
}

export function ProductForm({ product }: { product?: Product | null }) {
  const { t } = useI18n();
  const action = saveProductAction.bind(null, product?.id ?? null);

  const [form, setForm] = useState({
    name: product?.name ?? "",
    category: product?.categorySlug ?? CATEGORIES[0].slug,
    price: product?.price?.toString() ?? "",
    cost: product?.cost?.toString() ?? "",
    oldPrice: product?.oldPrice?.toString() ?? "",
    stages: product?.stages?.toString() ?? "",
    capacity: product?.capacity ?? "",
    warranty: product?.warranty ?? "",
    stock: product?.stock?.toString() ?? "",
    shortDescription: product?.shortDescription ?? "",
    description: product?.description ?? "",
    features: product?.features?.join("\n") ?? "",
    badges: product?.badges ?? [],
    inStock: product?.inStock ?? true,
    allowBackorder: product?.allowBackorder ?? false,
    hue: product?.hue ?? 205,
  });
  // Multi-image manager: one ordered list of existing URLs + newly picked files. Any image
  // can be dragged to reorder (first = cover); each is removable.
  const [items, setItems] = useState<ImgItem[]>(() =>
    (product?.images ?? []).map((url, i) => ({ id: `e-${i}`, kind: "existing" as const, url })),
  );
  const idCounter = useRef(0);
  const pickerRef = useRef<HTMLInputElement>(null); // selection only — value reset each pick
  const carrierRef = useRef<HTMLInputElement>(null); // name="images" — submitted (new files, in order)
  const urlsRef = useRef<string[]>([]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  // Mirror the NEW files (in display order) into the hidden carrier input; `imageOrder`
  // (hidden) tells the server where each new file goes among the kept existing URLs.
  useEffect(() => {
    urlsRef.current = items.filter((it) => it.kind === "new").map((it) => it.url);
    if (!carrierRef.current) return;
    const dt = new DataTransfer();
    items.forEach((it) => {
      if (it.kind === "new") dt.items.add(it.file);
    });
    carrierRef.current.files = dt.files;
  }, [items]);

  // Revoke object URLs on unmount (e.g. after the save redirect) to avoid leaks.
  useEffect(() => () => urlsRef.current.forEach((u) => URL.revokeObjectURL(u)), []);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function toggleBadge(b: string) {
    setForm((f) => ({
      ...f,
      badges: f.badges.includes(b) ? f.badges.filter((x) => x !== b) : [...f.badges, b],
    }));
  }
  function onAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? []).filter((f) => f.size > 0);
    setItems((prev) => [
      ...prev,
      ...chosen.map((file) => ({ id: `n-${idCounter.current++}`, kind: "new" as const, file, url: URL.createObjectURL(file) })),
    ]);
    e.target.value = ""; // reset the picker so selecting the same file again still fires change
  }
  function removeItem(id: string) {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it && it.kind === "new") URL.revokeObjectURL(it.url);
      return prev.filter((x) => x.id !== id);
    });
  }
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldI = prev.findIndex((it) => it.id === active.id);
      const newI = prev.findIndex((it) => it.id === over.id);
      return oldI < 0 || newI < 0 ? prev : arrayMove(prev, oldI, newI);
    });
  }

  // imageOrder: existing URL where kept, null where a new file should be inserted (in order).
  const imageOrder = JSON.stringify(items.map((it) => (it.kind === "existing" ? it.url : null)));
  const previewImg = items[0]?.url;
  const priceNum = Number(form.price) || 0;
  const oldNum = Number(form.oldPrice) || 0;

  return (
    <form action={action} className="font-semibold">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/products"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-ink hover:bg-muted/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">
            {product ? t("admin.productForm.editTitle") : t("admin.productForm.addTitle")}
          </h1>
          <p className="text-sm text-ink-soft">{t("admin.productForm.subtitle")}</p>
        </div>
      </div>

      {/* form plumbing (hidden carriers, not UI) */}
      <input type="hidden" name="imageOrder" value={imageOrder} />
      {product && <input type="hidden" name="slug" value={product.slug} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        {/* Main */}
        <div className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="font-display font-bold text-ink">{t("admin.productForm.generalInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className={labelCls}>{t("admin.productForm.nameLabel")}</Label>
                <Input name="name" required value={form.name} onChange={(e) => set("name", e.target.value)} className={fieldCls} placeholder={t("admin.productForm.namePlaceholder")} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className={labelCls}>{t("admin.productForm.categoryLabel")}</Label>
                  <Select name="category" value={form.category} onValueChange={(v) => set("category", String(v))}>
                    <SelectTrigger className="min-h-11 w-full rounded-xl">
                      <SelectValue>{(value) => (value ? t(`cat.${String(value)}.name`) : "")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.slug} value={c.slug}>
                          {t(`cat.${c.slug}.name`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={labelCls}>{t("admin.productForm.warrantyLabel")}</Label>
                  <Input name="warranty" value={form.warranty} onChange={(e) => set("warranty", e.target.value)} className={fieldCls} placeholder={t("admin.productForm.warrantyPlaceholder")} />
                </div>
              </div>
              <div>
                <Label className={labelCls}>{t("admin.productForm.shortDescriptionLabel")}</Label>
                <Input name="shortDescription" value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} className={fieldCls} placeholder={t("admin.productForm.shortDescriptionPlaceholder")} />
              </div>
              <div>
                <Label className={labelCls}>{t("admin.productForm.descriptionLabel")}</Label>
                <Textarea name="description" value={form.description} onChange={(e) => set("description", e.target.value)} rows={5} className="rounded-xl" placeholder={t("admin.productForm.descriptionPlaceholder")} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="font-display font-bold text-ink">{t("admin.productForm.priceStock")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label className={labelCls}>{t("admin.productForm.priceLabel")}</Label>
                  <Input name="price" required type="number" value={form.price} onChange={(e) => set("price", e.target.value)} className={fieldCls} placeholder="1900" />
                </div>
                <div>
                  <Label className={labelCls}>{t("admin.productForm.costLabel")}</Label>
                  <Input name="cost" type="number" value={form.cost} onChange={(e) => set("cost", e.target.value)} className={fieldCls} placeholder="800" />
                </div>
                <div>
                  <Label className={labelCls}>{t("admin.productForm.oldPriceLabel")}</Label>
                  <Input name="oldPrice" type="number" value={form.oldPrice} onChange={(e) => set("oldPrice", e.target.value)} className={fieldCls} placeholder="2300" />
                </div>
                <div>
                  <Label className={labelCls}>{t("admin.productForm.stockLabel")}</Label>
                  <Input name="stock" type="number" value={form.stock} onChange={(e) => set("stock", e.target.value)} className={fieldCls} placeholder="20" />
                </div>
              </div>
              <Label className="mt-4 cursor-pointer gap-3 font-semibold text-ink">
                <Checkbox name="inStock" checked={form.inStock} onCheckedChange={(c) => set("inStock", c === true)} />
                {t("admin.productForm.inStockLabel")}
              </Label>
              <Label className="mt-3 cursor-pointer items-start gap-3">
                <Checkbox name="allowBackorder" checked={form.allowBackorder} onCheckedChange={(c) => set("allowBackorder", c === true)} className="mt-0.5" />
                <span className="text-sm text-ink">
                  <span className="font-semibold">{t("admin.productForm.allowBackorderLabel")}</span>
                  <span className="block text-xs font-semibold text-ink-soft">{t("admin.productForm.allowBackorderHint")}</span>
                </span>
              </Label>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="font-display font-bold text-ink">{t("admin.productForm.specifications")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className={labelCls}>{t("admin.productForm.stagesLabel")}</Label>
                  <Input name="stages" type="number" value={form.stages} onChange={(e) => set("stages", e.target.value)} className={fieldCls} placeholder="6" />
                </div>
                <div>
                  <Label className={labelCls}>{t("admin.productForm.capacityLabel")}</Label>
                  <Input name="capacity" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} className={fieldCls} placeholder="75 GPD" />
                </div>
              </div>
              <div className="mt-4">
                <Label className={labelCls}>
                  {t("admin.productForm.featuresLabel")}{" "}
                  <span className="font-semibold text-ink-soft">{t("admin.productForm.featuresHint")}</span>
                </Label>
                <Textarea name="features" value={form.features} onChange={(e) => set("features", e.target.value)} rows={4} className="rounded-xl" placeholder={t("admin.productForm.featuresPlaceholder")} />
              </div>
              <div className="mt-4">
                <span className={cn("block", labelCls)}>{t("admin.productForm.badgesLabel")}</span>
                <div className="flex flex-wrap gap-2">
                  {BADGES.map((b) => {
                    const active = form.badges.includes(b);
                    return (
                      <Label
                        key={b}
                        className={cn(
                          "cursor-pointer gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                          active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-ink-soft hover:border-brand-300",
                        )}
                      >
                        <Checkbox name="badges" value={b} checked={active} onCheckedChange={() => toggleBadge(b)} className="size-3.5" />
                        {b}
                      </Label>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: image + preview + save */}
        <aside className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="font-display font-bold text-ink">{t("admin.productForm.photos")}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Multi-image manager — drag to reorder (first = cover); each removable */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={items.map((it) => it.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-3 gap-2">
                    {items.map((item, i) => (
                      <SortableThumb
                        key={item.id}
                        item={item}
                        isCover={i === 0}
                        coverLabel={t("admin.productForm.coverLabel")}
                        onRemove={() => removeItem(item.id)}
                      />
                    ))}
                    {/* Add tile (not draggable) */}
                    <Button type="button" variant="ghost" onClick={() => pickerRef.current?.click()} className="flex aspect-square h-auto w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-neutral-300 p-2 text-ink-soft hover:border-brand-400 hover:bg-transparent">
                      <ImagePlus className="h-6 w-6" />
                      <span className="text-xs font-semibold">{t("admin.productForm.clickToAdd")}</span>
                    </Button>
                  </div>
                </SortableContext>
              </DndContext>
              <p className="mt-2 text-xs text-ink-soft">{t("admin.productForm.fileTypes")}</p>

              {/* hidden plumbing: picker = selection (value resets each pick); carrier = what the form submits */}
              <input ref={pickerRef} type="file" accept="image/*" multiple onChange={onAddFiles} className="hidden" />
              <input ref={carrierRef} type="file" name="images" multiple className="hidden" aria-hidden tabIndex={-1} />

              <div className="mt-4">
                <Label className={labelCls}>{t("admin.productForm.hueLabel")}</Label>
                <Slider
                  name="hue"
                  min={180}
                  max={230}
                  value={[form.hue]}
                  onValueChange={(v) => set("hue", Array.isArray(v) ? v[0] : v)}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Live shop preview */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="font-display font-bold text-ink">{t("admin.productForm.shopPreview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-card border border-line">
                <div className="relative aspect-square bg-card">
                  {previewImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewImg} alt="" className="h-full w-full object-contain p-3" />
                  ) : (
                    <ProductPhoto src={undefined} alt={form.name || t("admin.productForm.productFallback")} hue={form.hue} className="h-full w-full" />
                  )}
                  <div className="absolute left-2 top-2 flex flex-col gap-1">
                    {form.badges.map((b) => (
                      <Badge key={b} tone={toneForBadge(b)}>
                        {b}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="p-3">
                  <p dir="auto" className="line-clamp-1 font-display font-semibold text-ink">
                    {form.name || t("admin.productForm.nameFallback")}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    <StarRating value={5} size={13} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-semibold text-ink">{formatMAD(priceNum)}</span>
                    {oldNum > priceNum && (
                      <span className="text-xs text-ink-soft line-through">{formatMAD(oldNum)}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <SubmitButton />
        </aside>
      </div>
    </form>
  );
}
