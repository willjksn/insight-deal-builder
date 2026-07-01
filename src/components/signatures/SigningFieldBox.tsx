"use client";

import { cn } from "@/lib/utils/cn";
import { CheckCircle } from "lucide-react";
import { SigningFieldType } from "@/lib/agreement/signing";

interface SigningFieldBoxProps {
  type: SigningFieldType;
  label: string;
  isActive: boolean;
  isComplete: boolean;
  capturedImage?: string;
  appliedImage?: string;
  disabled?: boolean;
  onApply: () => void;
  onFocus?: () => void;
  /** Called when the field is active but signature/initials were not saved in setup yet. */
  onNeedsCapture?: () => void;
  fieldRef?: (el: HTMLButtonElement | null) => void;
}

export function SigningFieldBox({
  type,
  label,
  isActive,
  isComplete,
  capturedImage,
  appliedImage,
  disabled,
  onApply,
  onFocus,
  onNeedsCapture,
  fieldRef,
}: SigningFieldBoxProps) {
  const isInitial = type === "initial";
  const isApplied = isComplete && !!appliedImage;
  const hasCapture = !!capturedImage;
  const canApply = !isComplete && hasCapture && !disabled && isActive;

  const handleActivate = () => {
    if (disabled || isComplete) return;
    onFocus?.();
    if (canApply) {
      onApply();
      return;
    }
    if (isActive && !hasCapture) {
      onNeedsCapture?.();
    }
  };

  const hintText = isApplied
    ? null
    : isActive
      ? hasCapture
        ? "Tap to apply"
        : isInitial
          ? "Add initials"
          : "Add signature"
      : null;

  return (
    <button
      type="button"
      ref={fieldRef}
      onClick={handleActivate}
      disabled={disabled || isComplete}
      aria-label={
        isApplied
          ? `${label} initialed`
          : isActive
            ? hasCapture
              ? `${label} — tap to apply`
              : `${label} — set up ${isInitial ? "initials" : "signature"} first`
            : `${label} — waiting`
      }
      className={cn(
        "relative flex shrink-0 flex-col overflow-hidden rounded-md border-2 text-left transition-all",
        isInitial ? "h-14 w-14" : "h-16 w-44 sm:w-52",
        isApplied && "border-emerald-500 bg-emerald-50",
        isActive && !isComplete && "cursor-pointer border-sky-500 bg-sky-50 ring-2 ring-sky-400",
        !isActive && !isComplete && "border-slate-300 border-dashed bg-slate-50",
        disabled && !isComplete && "cursor-not-allowed opacity-60"
      )}
    >
      <p
        className={cn(
          "shrink-0 py-0.5 text-center text-[8px] font-semibold uppercase leading-none",
          isApplied && "text-emerald-700",
          isActive && !isComplete && "text-sky-700",
          !isActive && !isComplete && "text-slate-400"
        )}
      >
        {isInitial ? "Initial" : "Sign"}
      </p>

      <div className="flex min-h-0 flex-1 items-center justify-center bg-white px-1">
        {isApplied && appliedImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={appliedImage}
            alt={label}
            className={cn(
              "max-w-full object-contain",
              isInitial ? "max-h-7" : "max-h-11"
            )}
          />
        ) : (
          <span
            className={cn(
              "px-0.5 text-center text-[9px] font-medium leading-tight",
              isActive ? "text-sky-600" : "text-slate-300"
            )}
          >
            {hintText ?? ""}
          </span>
        )}
      </div>

      {isApplied && (
        <CheckCircle
          className="absolute bottom-0.5 right-0.5 h-3 w-3 text-emerald-600"
          aria-hidden
        />
      )}
    </button>
  );
}
