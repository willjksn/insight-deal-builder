"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ChevronDown, Lightbulb, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NOTE_TEMPLATES } from "@/lib/stage/types";
import { cn } from "@/lib/utils/cn";

export function StageNotesMenu({
  onAddTemplate,
  onPlaceOnCanvas,
  disabled,
}: {
  onAddTemplate: (template: keyof typeof NOTE_TEMPLATES) => void;
  onPlaceOnCanvas: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const items: {
    id: keyof typeof NOTE_TEMPLATES;
    label: string;
    hint: string;
    icon: typeof Camera;
  }[] = [
    { id: "camera", label: "Camera note", hint: "Lens, f-stop, ISO", icon: Camera },
    { id: "light", label: "Light note", hint: "Fixture, modifier, power", icon: Lightbulb },
    { id: "general", label: "General note", hint: "Blocking, spill, reminders", icon: StickyNote },
  ];

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        className={cn(open && "border-sky-300 bg-sky-50")}
        onClick={() => setOpen((v) => !v)}
      >
        <StickyNote className="mr-1 h-3.5 w-3.5" />
        Notes
        <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />
      </Button>
      {open && !disabled ? (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {items.map(({ id, label, hint, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50"
              onClick={() => {
                onAddTemplate(id);
                setOpen(false);
              }}
            >
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span>
                <span className="block font-medium text-slate-900">{label}</span>
                <span className="block text-[10px] text-slate-500">{hint}</span>
              </span>
            </button>
          ))}
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            className="flex w-full px-3 py-2 text-left text-xs font-medium text-sky-700 hover:bg-sky-50"
            onClick={() => {
              onPlaceOnCanvas();
              setOpen(false);
            }}
          >
            Click canvas to place…
          </button>
        </div>
      ) : null}
    </div>
  );
}
