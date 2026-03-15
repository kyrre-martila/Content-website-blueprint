"use client";

import * as React from "react";

type DestructiveConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmText?: string;
  details?: Array<{ label: string; value: string }>;
  isProcessing?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DestructiveConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  confirmText,
  details = [],
  isProcessing = false,
  onCancel,
  onConfirm,
}: DestructiveConfirmModalProps) {
  const [typedValue, setTypedValue] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setTypedValue("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const needsTypedConfirmation = Boolean(confirmText);
  const canConfirm =
    !needsTypedConfirmation || typedValue.trim() === (confirmText ?? "");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="page-editor__confirm-overlay"
    >
      <div className="page-editor__confirm-dialog">
        <h2>{title}</h2>
        <p>{description}</p>
        {details.length > 0 ? (
          <dl>
            {details.map((item) => (
              <React.Fragment key={item.label}>
                <dt>
                  <strong>{item.label}</strong>
                </dt>
                <dd>{item.value}</dd>
              </React.Fragment>
            ))}
          </dl>
        ) : null}
        {needsTypedConfirmation ? (
          <label>
            Type <strong>{confirmText}</strong> to continue
            <input
              value={typedValue}
              onChange={(event) => setTypedValue(event.target.value)}
              placeholder={confirmText}
            />
          </label>
        ) : null}
        <div className="page-editor__actions">
          <button type="button" onClick={onCancel} disabled={isProcessing}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing || !canConfirm}
          >
            {isProcessing ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
