"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductBySlug,
  type ProductInput,
} from "@/lib/data";
import { uploadProductImage } from "@/lib/storage";
import type { Spec } from "@/lib/types";

const AR: Record<string, string> = {
  "ا": "a", "أ": "a", "إ": "i", "آ": "a", "ب": "b", "ت": "t", "ث": "th",
  "ج": "j", "ح": "h", "خ": "kh", "د": "d", "ذ": "dh", "ر": "r", "ز": "z",
  "س": "s", "ش": "sh", "ص": "s", "ض": "d", "ط": "t", "ظ": "z", "ع": "a",
  "غ": "gh", "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n",
  "ه": "h", "و": "w", "ي": "y", "ى": "a", "ة": "a",
};

function asciiSlug(s: string): string {
  let out = "";
  for (const ch of s) {
    if (/[a-zA-Z0-9]/.test(ch)) out += ch;
    else if (AR[ch] !== undefined) out += AR[ch];
    else out += "-";
  }
  out = out.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (out.length > 55) out = out.slice(0, 55).replace(/-[^-]*$/, "");
  if (out.replace(/-/g, "").length < 2) out = "produit";
  return out;
}

async function uniqueSlug(name: string): Promise<string> {
  const base = asciiSlug(name);
  let slug = base;
  let i = 2;
  while (await getProductBySlug(slug)) slug = `${base}-${i++}`;
  return slug;
}

function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function saveProductAction(
  id: string | null,
  formData: FormData,
): Promise<void> {
  await requireRole(["admin"]);

  const name = String(formData.get("name") ?? "").trim();
  const categorySlug = String(formData.get("category") ?? "cuisine");
  const price = num(formData.get("price")) ?? 0;
  const cost = num(formData.get("cost")) ?? 0;
  const oldPrice = num(formData.get("oldPrice"));
  const stages = num(formData.get("stages"));
  const capacity = String(formData.get("capacity") ?? "").trim() || null;
  const warranty = String(formData.get("warranty") ?? "").trim() || null;
  const stock = num(formData.get("stock")) ?? 100;
  const shortDescription = String(formData.get("shortDescription") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const features = String(formData.get("features") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const badges = formData.getAll("badges").map(String);
  const inStock = formData.get("inStock") != null;
  const allowBackorder = formData.get("allowBackorder") != null;
  const hue = num(formData.get("hue")) ?? 205;

  // server-side validation
  if (name.length < 2) throw new Error("Le nom du produit est requis.");
  if (!Number.isFinite(price) || price <= 0)
    throw new Error("Le prix doit être un nombre supérieur à 0.");
  if (stock < 0) throw new Error("Le stock ne peut pas être négatif.");

  // Upload the new files (in submission order), then assemble the final image list in the
  // admin's chosen order. `imageOrder` is a JSON array where each entry is either an existing
  // URL (string) or null (= consume the next newly-uploaded file). Falls back to the legacy
  // "existing JSON + appended uploads" contract if imageOrder isn't present.
  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const uploaded: string[] = [];
  for (const f of files) uploaded.push(await uploadProductImage(f));

  let images: string[] = [];
  const orderRaw = String(formData.get("imageOrder") ?? "");
  if (orderRaw) {
    let order: (string | null)[] = [];
    try {
      order = JSON.parse(orderRaw) as (string | null)[];
    } catch {
      order = [];
    }
    // The client emits one null per new image; the server must have uploaded exactly that
    // many. If they disagree (e.g. a file was dropped), fail loud instead of silently
    // dropping/misordering images.
    const nullCount = order.filter((e) => e === null).length;
    if (nullCount !== uploaded.length) {
      throw new Error("Échec de l'envoi des images. Réessayez.");
    }
    let ni = 0;
    images = order
      .map((entry) => (entry === null ? uploaded[ni++] : entry))
      .filter((u): u is string => typeof u === "string" && u.length > 0);
  } else {
    const existing = String(formData.get("existingImages") ?? "");
    if (existing) {
      try {
        images = JSON.parse(existing) as string[];
      } catch {
        /* ignore */
      }
    }
    images = [...images, ...uploaded];
  }

  const specs: Spec[] = [];
  if (stages) specs.push({ label: "Étapes", value: String(stages) });
  if (capacity) specs.push({ label: "Débit", value: capacity });
  if (warranty) specs.push({ label: "Garantie", value: warranty });

  const slug = id
    ? String(formData.get("slug") ?? "") || (await uniqueSlug(name))
    : await uniqueSlug(name);

  const input: ProductInput = {
    slug,
    name,
    categorySlug,
    shortDescription,
    description,
    price,
    cost,
    oldPrice,
    stages,
    capacity,
    warranty,
    badges,
    inStock,
    stock,
    allowBackorder,
    bestSeller: badges.includes("Best Seller"),
    hue,
    images,
    features,
    specs,
  };

  if (id) await updateProduct(id, input);
  else await createProduct(input);

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
  redirect("/admin/products");
}

export async function deleteProductAction(id: string): Promise<void> {
  await requireRole(["admin"]);
  await deleteProduct(id);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
}
