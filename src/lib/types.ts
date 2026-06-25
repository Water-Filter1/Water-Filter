/* ============================================================
   Shared data types for Filtre Maroc
   (Used by mock data now; same shapes will map to the DB later)
   ============================================================ */

export type Category = {
  id: string;
  slug: string;
  name: string; // French label
  nameAr: string; // Arabic label
  tagline: string;
  icon: CategoryIcon;
  hue: number; // base hue for category visuals
};

export type CategoryIcon =
  | "kitchen"
  | "home"
  | "fountain"
  | "industrial"
  | "cartridge"
  | "parts";

export type Review = {
  id: string;
  author: string;
  city: string;
  rating: number; // 1..5
  date: string; // ISO
  title: string;
  body: string;
  verified: boolean;
};

export type ProductVariant = {
  id: string;
  label: string;
  priceDelta: number; // added to base price
};

export type Spec = { label: string; value: string };

export type Product = {
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  shortDescription: string;
  description: string;
  price: number;
  cost?: number;
  oldPrice?: number;
  rating: number; // 0..5
  reviewCount: number;
  stages?: number; // filtration stages
  capacity?: string; // e.g. "400 GPD"
  warranty?: string; // e.g. "2 ans"
  badges: string[]; // "Best Seller", "Promo", "Nouveau"
  inStock: boolean;
  stock: number;
  allowBackorder?: boolean; // "sur commande": orderable even at 0 stock
  bestSeller?: boolean;
  hue: number; // 0..360, fallback visual gradient when no photo
  images: string[]; // real product photo URLs (Shopify CDN for now)
  features: string[];
  specs: Spec[];
  variants?: ProductVariant[];
  reviews: Review[];
};

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  hue: number;
  image?: string;
  qty: number;
  variantLabel?: string;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "installed"
  | "cancelled";

export type OrderItem = {
  name: string;
  qty: number;
  price: number;
  variantLabel?: string;
  productId?: string;
};

export type Order = {
  id: string;
  customerName: string;
  phone: string;
  city: string;
  address: string;
  note?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string; // ISO
  confirmationNote?: string;
  source: "web" | "phone";
  confirmedAt?: string; // ISO
  installDate?: string; // ISO — scheduled installation
  assignedTo?: string; // plombier email
  completedAt?: string; // ISO — when the plombier marked it installed
  photoUrl?: string; // completion photo
  invoiceRef?: string; // facture display ref (FAC-NNNNN), if one has been issued for this order
  invoiceUrl?: string; // absolute link to the public facture page, for re-sending to the client
  installStage?: "enroute" | "arrived"; // plombier progress (null = scheduled)
  kind: "install" | "maintenance";
  parentOrderId?: string; // for a maintenance visit, the original installation
  lastOutcome?: "confirmed" | "rappeler" | "pas_reponse" | "cancelled";
  callAttempts: number;
  warrantyMonths: number;
  maintenanceMonths: number;
  nextMaintenanceAt?: string; // ISO — next filter change due
  lastMaintenanceAt?: string; // ISO
};
