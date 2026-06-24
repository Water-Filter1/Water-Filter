import { redirect } from "next/navigation";

// Technicians now live in the unified Service page (Maintenance + Technicians).
// Kept as a redirect so old bookmarks / links continue to work.
export default function AdminTechniciensPage() {
  redirect("/admin/service?tab=technicians");
}
