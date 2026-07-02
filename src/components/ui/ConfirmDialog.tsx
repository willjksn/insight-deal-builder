"use client";

import { useEffect, useId } from "react";
import { Button } from "@/components/ui/Button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
        onClick={loading ? undefined : onCancel}
        aria-label="Close dialog"
        disabled={loading}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <p id={descId} className="mt-2 text-sm leading-relaxed text-slate-600">
          {description}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="touch"
            onClick={onCancel}
            disabled={loading}
            className="sm:min-w-0 sm:px-4 sm:py-2 sm:text-sm"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="touch"
            onClick={onConfirm}
            disabled={loading}
            className="sm:min-w-0 sm:px-4 sm:py-2 sm:text-sm"
          >
            {loading ? "Deleting…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
