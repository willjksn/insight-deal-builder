"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  CREATOR_PLATFORM_LABELS,
  type CreatorPlatform,
  type CreatorPlatformType,
} from "@/lib/creators/types";

const PLATFORM_OPTIONS = (Object.keys(CREATOR_PLATFORM_LABELS) as CreatorPlatformType[]).map(
  (value) => ({ value, label: CREATOR_PLATFORM_LABELS[value] })
);

type Props = {
  platforms: CreatorPlatform[];
  canEdit: boolean;
  saving?: boolean;
  onSave: (platforms: CreatorPlatform[]) => Promise<void>;
};

function emptyPlatform(): CreatorPlatform {
  return {
    id: crypto.randomUUID(),
    platform: "instagram",
    handle: "",
    profileUrl: "",
    followers: undefined,
    averageViews: undefined,
    engagementRate: undefined,
  };
}

export function CreatorPlatformsPanel({ platforms, canEdit, saving, onSave }: Props) {
  const [items, setItems] = useState<CreatorPlatform[]>(platforms);
  const [dirty, setDirty] = useState(false);

  const update = (id: string, patch: Partial<CreatorPlatform>) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setDirty(true);
  };

  const add = () => {
    setItems((prev) => [...prev, emptyPlatform()]);
    setDirty(true);
  };

  const remove = (id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
    setDirty(true);
  };

  const handleSave = async () => {
    await onSave(
      items.map((p) => ({
        ...p,
        handle: p.handle?.trim() || undefined,
        profileUrl: p.profileUrl?.trim() || undefined,
        lastUpdated: new Date().toISOString(),
      }))
    );
    setDirty(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Platforms &amp; metrics</h2>
        {canEdit && (
          <Button type="button" size="sm" variant="outline" onClick={add}>
            <Plus className="mr-1 h-4 w-4" /> Add platform
          </Button>
        )}
      </CardHeader>
      <CardBody className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No platforms yet.</p>
        ) : (
          items.map((p) => (
            <div
              key={p.id}
              className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 md:grid-cols-2"
            >
              <Select
                label="Platform"
                value={p.platform}
                options={PLATFORM_OPTIONS}
                disabled={!canEdit}
                onChange={(e) => update(p.id, { platform: e.target.value as CreatorPlatformType })}
                touch
              />
              <Input
                label="Handle"
                value={p.handle ?? ""}
                disabled={!canEdit}
                onChange={(e) => update(p.id, { handle: e.target.value })}
                touch
              />
              <Input
                label="Profile URL"
                value={p.profileUrl ?? ""}
                disabled={!canEdit}
                onChange={(e) => update(p.id, { profileUrl: e.target.value })}
                touch
              />
              <Input
                label="Followers"
                type="number"
                value={p.followers ?? ""}
                disabled={!canEdit}
                onChange={(e) =>
                  update(p.id, {
                    followers: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
                touch
              />
              <Input
                label="Avg views"
                type="number"
                value={p.averageViews ?? ""}
                disabled={!canEdit}
                onChange={(e) =>
                  update(p.id, {
                    averageViews: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
                touch
              />
              <Input
                label="Engagement %"
                type="number"
                value={p.engagementRate ?? ""}
                disabled={!canEdit}
                onChange={(e) =>
                  update(p.id, {
                    engagementRate: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
                touch
              />
              {canEdit && (
                <div className="md:col-span-2 flex justify-end">
                  <Button type="button" size="sm" variant="ghost" onClick={() => remove(p.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
        {canEdit && dirty && (
          <Button type="button" size="touch" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save platforms"}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
