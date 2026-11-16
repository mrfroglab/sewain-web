import { redirect } from "next/navigation";

// Notification e-mails link here (sewain-api NOTIFY_PREFS_PATH default). The preferences live in the settings page.
export default function NotifikasiPrefsPage() {
  redirect("/profil/pengaturan#notifikasi");
}
