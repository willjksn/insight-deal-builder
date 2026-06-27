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
  fieldRef?: (el: HTMLDivElement | null) => void;
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
  fieldRef,
}: SigningFieldBoxProps) {
  const isInitial = type === "initial";
  const isApplied = isComplete && !!appliedImage;
  const canApply = !isComplete && !!capturedImage && !disabled && isActive;

  const handleClick = () => {
    onFocus?.();
    if (canApply) onApply();
  };

  return (
    <div
      ref={fieldRef}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={
        isApplied
          ? `${label} initialed`
          : isActive
            ? `${label} — tap to apply`
            : `${label} — waiting`
      }
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
      className={cn(
        "relative flex shrink-0 flex-col overflow-hidden rounded-md border-2 transition-all",
        isInitial ? "h-14 w-14" : "h-16 w-44 sm:w-52",
        isApplied && "border-emerald-500 bg-emerald-50",
        isActive && !isComplete && "cursor-pointer border-sky-500 bg-sky-50 ring-2 ring-sky-400",
        !isActive && !isComplete && "border-slate-300 border-dashed bg-slate-50"
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
              "text-[9px] font-medium leading-none",
              isActive ? "text-sky-600" : "text-slate-300"
            )}
          >
            {isActive ? "Tap" : ""}
          </span>
        )}
      </div>

      {isApplied && (
        <CheckCircle
          className="absolute bottom-0.5 right-0.5 h-3 w-3 text-emerald-600"
          aria-hidden
        />
      )}
    </div>
  );
}
