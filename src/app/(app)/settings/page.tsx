import { redirect } from "next/navigation";

// Settings was folded into the Profile page. Keep this route alive so old
// links/bookmarks still land somewhere useful.
export default function SettingsPage() {
  redirect("/profile");
}
