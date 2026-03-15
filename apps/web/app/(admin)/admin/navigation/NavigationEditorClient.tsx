"use client";

import * as React from "react";
import type { AdminNavigationItem } from "../../../../lib/admin/navigation";
import { DestructiveConfirmModal } from "../components/DestructiveConfirmModal";

type FormState = {
  label: string;
  url: string;
  order: string;
  parentId: string;
};

const EMPTY_FORM: FormState = { label: "", url: "", order: "0", parentId: "" };

export function NavigationEditorClient({
  initialItems,
}: {
  initialItems: AdminNavigationItem[];
}) {
  const [items, setItems] = React.useState(initialItems);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = React.useState<AdminNavigationItem | null>(null);

  const sortedItems = React.useMemo(
    () =>
      [...items].sort(
        (a, b) => a.order - b.order || a.label.localeCompare(b.label),
      ),
    [items],
  );

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function editItem(item: AdminNavigationItem) {
    setEditingId(item.id);
    setForm({
      label: item.label,
      url: item.url,
      order: String(item.order),
      parentId: item.parentId ?? "",
    });
    setError(null);
    setStatus(null);
  }

  async function reloadItems() {
    const res = await fetch("/api/admin/navigation-items", {
      cache: "no-store",
    });
    const data = await res.json().catch(() => []);
    if (!res.ok || !Array.isArray(data)) {
      throw new Error("Unable to refresh navigation items.");
    }
    setItems(data as AdminNavigationItem[]);
  }

  function validateForm(): {
    label: string;
    url: string;
    order: number;
    parentId: string | null;
  } | null {
    const label = form.label.trim();
    const url = form.url.trim();
    const order = Number(form.order);

    if (!label) {
      setError("Label is required.");
      return null;
    }

    if (!url) {
      setError("URL is required.");
      return null;
    }

    if (!Number.isInteger(order) || order < 0) {
      setError("Order must be a whole number equal to or greater than 0.");
      return null;
    }

    if (form.parentId && form.parentId === editingId) {
      setError("An item cannot be its own parent.");
      return null;
    }

    return { label, url, order, parentId: form.parentId || null };
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);

    const payload = validateForm();
    if (!payload) {
      return;
    }

    setIsSaving(true);

    try {
      const endpoint = editingId
        ? `/api/admin/navigation-items/${editingId}`
        : "/api/admin/navigation-items";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message =
          (data && (data.message || data.error)) ||
          "Unable to save navigation item.";
        setError(
          typeof message === "string"
            ? message
            : "Unable to save navigation item.",
        );
        return;
      }

      await reloadItems();
      setStatus(
        editingId ? "Navigation item updated." : "Navigation item created.",
      );
      resetForm();
    } catch {
      setError("Network error while saving navigation item.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteItem(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    setPendingDeleteItem(item);
  }

  async function confirmDeleteItem() {
    if (!pendingDeleteItem) {
      return;
    }

    setError(null);
    setStatus(null);

    try {
      const res = await fetch(`/api/admin/navigation-items/${pendingDeleteItem.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("Unable to delete navigation item.");
        return;
      }
      await reloadItems();
      if (editingId === pendingDeleteItem.id) {
        resetForm();
      }
      setStatus("Navigation item deleted.");
      setPendingDeleteItem(null);
    } catch {
      setError("Network error while deleting navigation item.");
    }
  }

  async function shiftItem(item: AdminNavigationItem, direction: -1 | 1) {
    const siblings = sortedItems.filter(
      (entry) => (entry.parentId ?? "") === (item.parentId ?? ""),
    );
    const index = siblings.findIndex((entry) => entry.id === item.id);
    const target = siblings[index + direction];

    if (!target) {
      return;
    }

    setError(null);
    setStatus(null);

    try {
      const updates = [
        fetch(`/api/admin/navigation-items/${item.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ order: target.order }),
        }),
        fetch(`/api/admin/navigation-items/${target.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ order: item.order }),
        }),
      ];

      const [first, second] = await Promise.all(updates);
      if (!first.ok || !second.ok) {
        setError("Unable to reorder navigation items.");
        return;
      }

      await reloadItems();
      setStatus("Navigation order updated.");
    } catch {
      setError("Network error while reordering items.");
    }
  }

  return (
    <section className="page-editor" aria-labelledby="navigation-heading">
      <div className="page-editor__header">
        <p className="hero__eyebrow">Content</p>
        <h1 id="navigation-heading">Navigation</h1>
        <p>
          Manage header/footer links with optional parent-child relationships.
        </p>
      </div>

      <form className="page-editor__form" onSubmit={saveItem}>
        <label>
          Label
          <input
            value={form.label}
            onChange={(e) => setForm((v) => ({ ...v, label: e.target.value }))}
          />
        </label>
        <label>
          URL
          <input
            value={form.url}
            onChange={(e) => setForm((v) => ({ ...v, url: e.target.value }))}
          />
        </label>
        <label>
          Order
          <input
            type="number"
            min={0}
            value={form.order}
            onChange={(e) => setForm((v) => ({ ...v, order: e.target.value }))}
          />
        </label>
        <label>
          Parent item
          <select
            value={form.parentId}
            onChange={(e) =>
              setForm((v) => ({ ...v, parentId: e.target.value }))
            }
          >
            <option value="">None (top level)</option>
            {sortedItems
              .filter((item) => item.id !== editingId)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
          </select>
        </label>

        {error && <p className="page-editor__error">{error}</p>}
        {status && <p className="page-editor__status">{status}</p>}

        <div className="page-editor__actions">
          <button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : editingId ? "Update item" : "Create item"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <div
        className="admin-pages__list"
        role="list"
        aria-label="Navigation items"
      >
        {sortedItems.map((item) => (
          <article className="admin-pages__item" role="listitem" key={item.id}>
            <div>
              <h2>{item.label}</h2>
              <p>{item.url}</p>
              <p>
                order: {item.order} • parent: {item.parentId ?? "none"}
              </p>
            </div>
            <div className="page-editor__block-toolbar">
              <div>
                <button type="button" onClick={() => shiftItem(item, -1)}>
                  ↑
                </button>
                <button type="button" onClick={() => shiftItem(item, 1)}>
                  ↓
                </button>
                <button type="button" onClick={() => editItem(item)}>
                  Edit
                </button>
                <button type="button" onClick={() => deleteItem(item.id)}>
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}

        {sortedItems.length === 0 && (
          <p className="admin-pages__empty">No navigation items yet.</p>
        )}
      </div>

      <DestructiveConfirmModal
        open={Boolean(pendingDeleteItem)}
        title="Delete navigation item"
        description="This permanently removes this link from navigation. Visitors may lose key paths until links are restored."
        confirmLabel="Delete navigation item"
        confirmText="DELETE"
        details={
          pendingDeleteItem
            ? [
                { label: "Label", value: pendingDeleteItem.label },
                { label: "URL", value: pendingDeleteItem.url },
                {
                  label: "Hierarchy impact",
                  value: pendingDeleteItem.parentId
                    ? "This is a nested item. Check parent/child navigation after deletion."
                    : "This is a top-level item and may affect primary navigation.",
                },
              ]
            : []
        }
        onCancel={() => setPendingDeleteItem(null)}
        onConfirm={() => void confirmDeleteItem()}
      />
    </section>
  );
}
