import { listAdminNavigationItems } from "../../../../lib/admin/navigation";
import { NavigationEditorClient } from "./NavigationEditorClient";

export default async function AdminNavigationPage() {
  const items = await listAdminNavigationItems();

  return <NavigationEditorClient initialItems={items} />;
}
