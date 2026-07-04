"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ProductionShootingKit,
  SHOOTING_KIT_CATEGORY_LABELS,
  SHOOTING_KIT_PLACEHOLDERS,
  ShootingKitCategory,
  shootingKitItemCount,
} from "@/lib/production/shootingKit";
import { cn } from "@/lib/utils/cn";

const CATEGORIES: ShootingKitCategory[] = [
  "cameraBodies",
  "lenses",
  "supports",
  "lights",
  "grip",
  "audio",
  "props",
  "other",
];

interface ShootingKitEditorProps {
  kit: ProductionShootingKit;
  notes?: string;
  onChange: (kit: ProductionShootingKit, notes?: string) => void;
  compact?: boolean;
  className?: string;
  /** Extra actions (import from agreement, load from board, etc.) */
  footerActions?: React.ReactNode;
}

export function ShootingKitEditor({
  kit,
  notes = "",
  onChange,
  compact = false,
  className,
  footerActions,
}: ShootingKitEditorProps) {
  const updateKit = (next: ProductionShootingKit) => onChange(next, notes);
  const updateNotes = (nextNotes: string) => onChange(kit, nextNotes);

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-xs text-slate-500">
        Define your shoot-day kit here. Detailed shot lists assign camera, lens, support (dolly / gimbal /
        sticks), lights, and props from this list only.
      </p>

      <div className={cn("space-y-3", compact && "space-y-2")}>
        {CATEGORIES.map((cat) => (
          <KitCategorySection
            key={cat}
            label={SHOOTING_KIT_CATEGORY_LABELS[cat]}
            placeholder={SHOOTING_KIT_PLACEHOLDERS[cat]}
            items={kit[cat]}
            compact={compact}
            onChange={(items) => updateKit({ ...kit, [cat]: items })}
          />
        ))}
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600">Default camera settings</label>
        <Input
          value={kit.cameraSettingsNotes ?? ""}
          onChange={(e) =>
            updateKit({ ...kit, cameraSettingsNotes: e.target.value.trim() || undefined })
          }
          placeholder="e.g. FX3 · 24p · S-Cinetone · 4300K WB locked · EI 800"
          className="mt-1 text-sm"
        />
      </div>

      <textarea
        value={notes}
        onChange={(e) => updateNotes(e.target.value)}
        placeholder="Gear notes (rentals, who brings what, backup body…)"
        rows={2}
        className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
      />

      {footerActions ? <div className="flex flex-wrap gap-2">{footerActions}</div> : null}
    </div>
  );
}

export function shootingKitSummary(kit: ProductionShootingKit): string {
  const count = shootingKitItemCount(kit);
  if (!count && !kit.cameraSettingsNotes?.trim()) return "Add cameras, lenses, support, lights…";
  const parts: string[] = [];
  if (kit.cameraBodies.length) parts.push(`${kit.cameraBodies.length} cam`);
  if (kit.lenses.length) parts.push(`${kit.lenses.length} lens`);
  if (kit.supports.length) parts.push(`${kit.supports.length} support`);
  if (kit.lights.length) parts.push(`${kit.lights.length} light`);
  return parts.length ? parts.join(" · ") : "Settings only";
}

function KitCategorySection({
  label,
  placeholder,
  items,
  compact,
  onChange,
}: {
  label: string;
  placeholder: string;
  items: string[];
  compact?: boolean;
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(!compact || items.length > 0);

  const add = () => {
    const next = draft.trim();
    if (!next) return;
    onChange([...items, next]);
    setDraft("");
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{label}</span>
        <span className="text-slate-400">{items.length ? `${items.length}` : "—"}</span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-slate-100 px-3 pb-3 pt-2">
          {items.length > 0 ? (
            <ul className="space-y-1">
              {items.map((item, i) => (
                <li key={`${item}-${i}`} className="flex items-start gap-2 text-sm text-slate-800">
                  <span className="min-w-0 flex-1">{item}</span>
                  <button
                    type="button"
                    className="shrink-0 text-slate-300 hover:text-red-500"
                    onClick={() => onChange(items.filter((_, j) => j !== i))}
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <Button type="button" size="sm" disabled={!draft.trim()} onClick={add} className="shrink-0 px-2.5">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
