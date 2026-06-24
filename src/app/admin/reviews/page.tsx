import { redirect } from "next/navigation";

// Reviews now live in the unified Inbox (Messages + Reviews). Kept as a redirect
// so old bookmarks / links continue to work.
export default function AdminReviewsPage() {
  redirect("/admin/inbox?tab=reviews");
}
