import { redirect } from "next/navigation";

// Messages now live in the unified Inbox (Messages + Reviews). Kept as a redirect
// so old bookmarks / links continue to work.
export default function AdminMessagesPage() {
  redirect("/admin/inbox");
}
