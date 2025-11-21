"use client";

import React from "react";

import { UserProfile } from "../../../lib/me";

type EditableUser = UserProfile;

type EditingField =
  | "firstName"
  | "lastName"
  | "phone"
  | "birthDate"
  | "displayName"
  | null;

function getInitialsFromUser(user: UserProfile): string {
  if (user.firstName || user.lastName) {
    const first = user.firstName?.[0] ?? "";
    const last = user.lastName?.[0] ?? "";
    const initials = (first + last).trim();
    if (initials) return initials.toUpperCase();
  }
  if (user.displayName) {
    return user.displayName.charAt(0).toUpperCase();
  }
  return user.email.charAt(0).toUpperCase();
}

export function ProfileClient({ initialUser }: { initialUser: UserProfile }) {
  const [user, setUser] = React.useState<EditableUser>(initialUser);
  const [editingField, setEditingField] = React.useState<EditingField>(null);
  const [pendingField, setPendingField] = React.useState<EditingField>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function saveField(field: EditingField, value: string) {
    if (!field) return;
    setPendingField(field);
    setError(null);

    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg =
          (data && (data.message || data.error)) || "Could not update profile";
        setError(typeof msg === "string" ? msg : "Could not update profile");
        return;
      }

      const data = await res.json();
      if (data && data.user) {
        setUser(data.user);
      }
    } catch (e) {
      setError("Network error while updating profile");
    } finally {
      setPendingField(null);
      setEditingField(null);
    }
  }

  function InlineField(props: {
    label: string;
    field: EditingField;
    value: string | null;
  }) {
    const isEditing = editingField === props.field;
    const isPending = pendingField === props.field;
    const displayValue = props.value ?? "—";

    const [draft, setDraft] = React.useState(displayValue);

    React.useEffect(() => {
      if (!isEditing) {
        setDraft(displayValue);
      }
    }, [isEditing, displayValue]);

    const startEdit = () => {
      if (isPending) return;
      setEditingField(props.field);
      setDraft(displayValue === "—" ? "" : displayValue);
    };

    const cancelEdit = () => {
      if (isPending) return;
      setEditingField(null);
      setDraft(displayValue);
    };

    const handleSubmit = async () => {
      if (!props.field) return;
      await saveField(props.field, draft);
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (
      event,
    ) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void handleSubmit();
      } else if (event.key === "Escape") {
        event.preventDefault();
        cancelEdit();
      }
    };

    if (!isEditing) {
      return (
        <div className="profile__detail profile__detail--inline">
          <span className="profile__detail-label">{props.label}</span>
          <button
            type="button"
            className="profile__detail-value profile__detail-button"
            onClick={startEdit}
            disabled={isPending}
          >
            {displayValue}
          </button>
        </div>
      );
    }

    return (
      <div className="profile__detail profile__detail--inline">
        <span className="profile__detail-label">{props.label}</span>
        <div className="profile__detail-edit">
          <input
            className="profile__detail-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button
            type="button"
            className="profile__detail-save"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="profile__detail-cancel"
            onClick={cancelEdit}
            disabled={isPending}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const initials = getInitialsFromUser(user);
  const createdAt = new Date(user.createdAt).toLocaleDateString();
  const displayName = user.displayName ?? user.email;

  return (
    <section className="profile">
      <div className="profile__header">
        <div className="profile__avatar">
          <span className="profile__avatar-initials">{initials}</span>
        </div>
        <h1 className="profile__name">{displayName}</h1>
        <p className="profile__email">{user.email}</p>
      </div>

      <div className="profile__section">
        <h2 className="profile__section-title">Profile details</h2>

        {error && <p className="profile__error">{error}</p>}

        <div className="profile__details">
          <InlineField
            label="Display name"
            field="displayName"
            value={user.displayName}
          />
          <InlineField label="First name" field="firstName" value={user.firstName} />
          <InlineField label="Last name" field="lastName" value={user.lastName} />
          <InlineField label="Phone" field="phone" value={user.phone} />
          <InlineField label="Birth date" field="birthDate" value={user.birthDate} />
          <div className="profile__detail">
            <span>Role</span>
            <strong>{user.role}</strong>
          </div>
          <div className="profile__detail">
            <span>Created</span>
            <strong>{createdAt}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
