import { redirect } from "next/navigation";

import { listAdminAuditLogs } from "../../../../lib/admin/audit-logs";
import { getMe } from "../../../../lib/me";
import { canManageUsers } from "../../../../lib/roles";

type PageProps = {
  searchParams?: {
    userId?: string;
    action?: string;
    entityType?: string;
  };
};

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) {
    redirect("/access-denied");
  }

  const filters = {
    userId: searchParams?.userId?.trim() || undefined,
    action: searchParams?.action?.trim() || undefined,
    entityType: searchParams?.entityType?.trim() || undefined,
  };

  const logs = await listAdminAuditLogs(filters);

  return (
    <section className="admin-pages" aria-labelledby="audit-heading">
      <div className="admin-pages__header">
        <div>
          <p className="hero__eyebrow">Admin</p>
          <h1 id="audit-heading" className="hero__title">
            Audit log
          </h1>
          <p className="admin-pages__summary">
            Read-only history of sensitive admin actions.
          </p>
        </div>
      </div>

      <form
        method="get"
        className="admin-pages__help"
        style={{ display: "grid", gap: 8, marginBottom: 16 }}
      >
        <label>
          User ID
          <input
            name="userId"
            defaultValue={filters.userId ?? ""}
            className="admin-input"
          />
        </label>
        <label>
          Action
          <input
            name="action"
            defaultValue={filters.action ?? ""}
            className="admin-input"
          />
        </label>
        <label>
          Entity type
          <input
            name="entityType"
            defaultValue={filters.entityType ?? ""}
            className="admin-input"
          />
        </label>
        <button
          type="submit"
          className="btn btn--secondary"
          style={{ width: "fit-content" }}
        >
          Apply filters
        </button>
      </form>

      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Entity ID</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
                <td>{log.user?.email ?? log.userId ?? "system"}</td>
                <td>{log.action}</td>
                <td>{log.entityType}</td>
                <td>{log.entityId ?? "-"}</td>
                <td>
                  <code>
                    {log.metadata ? JSON.stringify(log.metadata) : "-"}
                  </code>
                </td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6}>No audit entries found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
