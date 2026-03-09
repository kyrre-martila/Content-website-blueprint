import { listAdminSettings } from "../../../../lib/admin/settings";
import { SettingsEditorClient } from "./SettingsEditorClient";

export default async function AdminSettingsPage() {
  const settings = await listAdminSettings();

  return <SettingsEditorClient initialSettings={settings} />;
}
