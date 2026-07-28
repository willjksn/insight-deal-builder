"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { CreatorAvailability } from "@/lib/creators/types";

type Props = {
  availability?: CreatorAvailability;
  canEdit: boolean;
  saving?: boolean;
  onSave: (availability: CreatorAvailability) => Promise<void>;
};

export function CreatorAvailabilityPanel({ availability, canEdit, saving, onSave }: Props) {
  const [form, setForm] = useState({
    general: availability?.general ?? "",
    advanceNoticeDays: availability?.advanceNoticeDays?.toString() ?? "",
    maxTravelMiles: availability?.maxTravelMiles?.toString() ?? "",
    blackoutDates: (availability?.blackoutDates ?? []).join(", "),
    notes: availability?.notes ?? "",
  });
  const [dirty, setDirty] = useState(false);

  const set = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Availability</h2>
      </CardHeader>
      <CardBody>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Textarea
              label="General availability"
              value={form.general}
              disabled={!canEdit}
              onChange={(e) => set({ general: e.target.value })}
              touch
            />
          </div>
          <Input
            label="Advance notice (days)"
            type="number"
            value={form.advanceNoticeDays}
            disabled={!canEdit}
            onChange={(e) => set({ advanceNoticeDays: e.target.value })}
            touch
          />
          <Input
            label="Max travel (miles)"
            type="number"
            value={form.maxTravelMiles}
            disabled={!canEdit}
            onChange={(e) => set({ maxTravelMiles: e.target.value })}
            touch
          />
          <div className="md:col-span-2">
            <Input
              label="Blackout dates (comma-separated)"
              value={form.blackoutDates}
              disabled={!canEdit}
              onChange={(e) => set({ blackoutDates: e.target.value })}
              touch
            />
          </div>
          <div className="md:col-span-2">
            <Textarea
              label="Notes"
              value={form.notes}
              disabled={!canEdit}
              onChange={(e) => set({ notes: e.target.value })}
              touch
            />
          </div>
        </div>
        {canEdit && dirty && (
          <div className="mt-4">
            <Button
              type="button"
              size="touch"
              disabled={saving}
              onClick={async () => {
                await onSave({
                  general: form.general.trim() || undefined,
                  advanceNoticeDays: form.advanceNoticeDays
                    ? Number(form.advanceNoticeDays)
                    : undefined,
                  maxTravelMiles: form.maxTravelMiles ? Number(form.maxTravelMiles) : undefined,
                  blackoutDates: form.blackoutDates
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                  notes: form.notes.trim() || undefined,
                });
                setDirty(false);
              }}
            >
              {saving ? "Saving…" : "Save availability"}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
