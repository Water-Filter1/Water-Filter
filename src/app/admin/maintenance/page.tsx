import { redirect } from "next/navigation";

// Maintenance / SAV now lives in the unified Service page (Maintenance + Technicians).
// Kept as a redirect so old bookmarks / links continue to work.
export default function AdminMaintenancePage() {
  redirect("/admin/service");
}
