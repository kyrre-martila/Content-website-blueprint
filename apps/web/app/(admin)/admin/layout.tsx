import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "../../AppShell";
import { getMe } from "../../../lib/me";
import { hasMinimumRole } from "../../../lib/rbac";

const adminNavItems = [
  { href: "/admin", label: "Overview", minRole: "editor" },
  { href: "/admin/pages", label: "Pages", minRole: "editor" },
  { href: "/admin/content?area=services", label: "Services", minRole: "editor" },
  { href: "/admin/content?area=news", label: "News", minRole: "editor" },
  { href: "/admin/content?area=team", label: "Team", minRole: "editor" },
  { href: "/admin/media", label: "Media", minRole: "admin" },
  { href: "/admin/settings", label: "Site settings", minRole: "admin" },
  { href: "/admin/content", label: "All content", minRole: "admin" },
  { href: "/admin/profile", label: "My profile", minRole: "editor" },
  { href: "/admin/system", label: "Builder / system", minRole: "super_admin" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const me = await getMe();
  const user = me?.user ?? null;

  if (!user || !hasMinimumRole(user.role, "editor")) {
    redirect("/login");
  }

  const visibleNavItems = adminNavItems
    .filter((item) => hasMinimumRole(user.role, item.minRole))
    .map(({ href, label }) => ({ href, label }));

  return (
    <AppShell navItems={visibleNavItems} user={user}>
      {children}
    </AppShell>
  );
}
