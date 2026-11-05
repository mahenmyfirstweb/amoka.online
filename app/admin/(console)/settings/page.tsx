import { notFound } from "next/navigation";
import { SettingsForm } from "@/components/admin/settings-form";
import { getStoreSettings } from "@/lib/catalog";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const settings = await getStoreSettings();
  if (!settings) notFound();

  return (
    <>
      <h1 className="mb-4 text-2xl">Settings</h1>
      <SettingsForm settings={settings} />
    </>
  );
}
