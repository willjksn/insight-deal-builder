"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface StickyActionBarProps {
  children: ReactNode;
  className?: string;
}

export function StickyActionBar({ children, className }: StickyActionBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-16 lg:bottom-0 left-0 right-0 z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-4 py-3 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] lg:pl-64",
        className
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 flex-wrap">
        {children}
      </div>
    </div>
  );
}

interface WizardStep {
  id: string;
  label: string;
}

export function WizardSteps({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (index: number) => void;
}) {
  return (
    <div className="mb-6 overflow-x-auto">
      <div className="flex gap-2 min-w-max pb-2">
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepClick?.(index)}
            disabled={!onStepClick}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
              index === currentStep
                ? "bg-gradient-to-r from-sky-400 to-sky-500 text-white shadow-md shadow-sky-500/25"
                : index < currentStep
                  ? "bg-sky-100 text-sky-900 ring-1 ring-sky-200"
                  : "bg-slate-100 text-slate-500"
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                index === currentStep
                  ? "bg-white text-sky-700"
                  : index < currentStep
                    ? "bg-sky-500 text-white"
                    : "bg-slate-300 text-slate-600"
              )}
            >
              {index + 1}
            </span>
            {step.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WizardNav({
  onBack,
  onNext,
  onSave,
  onCancel,
  nextLabel = "Next",
  backLabel = "Back",
  saveLabel = "Save Draft",
  cancelLabel = "Cancel",
  isLastStep = false,
  saving = false,
}: {
  onBack?: () => void;
  onNext?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  nextLabel?: string;
  backLabel?: string;
  saveLabel?: string;
  cancelLabel?: string;
  isLastStep?: boolean;
  saving?: boolean;
}) {
  return (
    <StickyActionBar>
      {onBack && (
        <Button variant="outline" size="touch" onClick={onBack}>
          {backLabel}
        </Button>
      )}
      {onCancel && (
        <Button variant="outline" size="touch" onClick={onCancel}>
          {cancelLabel}
        </Button>
      )}
      {onSave && (
        <Button variant="secondary" size="touch" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : saveLabel}
        </Button>
      )}
      {onNext && (
        <Button size="touch" onClick={onNext}>
          {isLastStep ? "Finish" : nextLabel}
        </Button>
      )}
    </StickyActionBar>
  );
}
