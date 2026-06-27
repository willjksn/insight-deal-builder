"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Lightbulb } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { InfoCallout, PageSection } from "@/components/ui/PageSection";
import { useAuth } from "@/contexts/AuthContext";
import {
  createLightFixture,
  deleteLightFixture,
  getLightFixtures,
  updateLightFixture,
} from "@/lib/firebase/scoutFirestore";
import { LightFixture, LightFixtureType, LightColorType } from "@/lib/scout/types";
import { MOCK_FIXTURE_CATALOG } from "@/lib/scout/mockFixtures";
import { canUseShotScout } from "@/lib/utils/permissions";

const FIXTURE_TYPES: { value: LightFixtureType; label: string }[] = [
  { value: "COB", label: "COB" },
  { value: "panel", label: "Panel" },
  { value: "tube", label: "Tube" },
  { value: "practical", label: "Practical" },
  { value: "rgb", label: "RGB" },
  { value: "other", label: "Other" },
];

const COLOR_TYPES: { value: LightColorType; label: string }[] = [
  { value: "daylight_only", label: "Daylight only" },
  { value: "bi_color", label: "Bi-color" },
  { value: "rgb", label: "RGB" },
  { value: "full_color", label: "Full color" },
  { value: "unknown", label: "Unknown" },
];

const EMPTY = {
  brand: "",
  model: "",
  fixtureType: "COB" as LightFixtureType,
  wattage: "",
  colorType: "bi_color" as LightColorType,
  cctMin: "",
  cctMax: "",
  fixedCct: "",
  modifiersOwned: "softbox, diffusion",
  controlMethod: "sidus_link",
  bestUses: "key, fill",
  roomSizeRating: "medium",
  userNotes: "",
};

export default function ScoutLightsSettingsPage() {
  const { user, appUser } = useAuth();
  const [fixtures, setFixtures] = useState<LightFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      setFixtures(await getLightFixtures(user.uid));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user?.uid]);

  if (!canUseShotScout(appUser)) {
    return (
      <div className="py-20 text-center text-slate-500">Lighting gear profiles require scout access.</div>
    );
  }

  const toPayload = () => ({
    brand: form.brand.trim(),
    model: form.model.trim(),
    fixtureType: form.fixtureType,
    wattage: form.wattage ? Number(form.wattage) : undefined,
    colorType: form.colorType,
    cctMin: form.cctMin ? Number(form.cctMin) : undefined,
    cctMax: form.cctMax ? Number(form.cctMax) : undefined,
    fixedCct: form.fixedCct ? Number(form.fixedCct) : undefined,
    modifiersOwned: form.modifiersOwned.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean),
    controlMethod: form.controlMethod as LightFixture["controlMethod"],
    bestUses: form.bestUses.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean) as LightFixture["bestUses"],
    roomSizeRating: form.roomSizeRating as LightFixture["roomSizeRating"],
    userNotes: form.userNotes.trim() || undefined,
  });

  const save = async () => {
    if (!user?.uid || !form.brand.trim() || !form.model.trim()) return;
    setSaving(true);
    try {
      const payload = toPayload();
      if (editingId) {
        await updateLightFixture(user.uid, editingId, payload);
      } else {
        await createLightFixture(user.uid, payload);
      }
      setForm(EMPTY);
      setEditingId(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const seedCatalog = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      for (const item of MOCK_FIXTURE_CATALOG) {
        await createLightFixture(user.uid, item);
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  const edit = (f: LightFixture) => {
    setEditingId(f.id);
    setForm({
      brand: f.brand,
      model: f.model,
      fixtureType: f.fixtureType,
      wattage: f.wattage?.toString() ?? "",
      colorType: f.colorType,
      cctMin: f.cctMin?.toString() ?? "",
      cctMax: f.cctMax?.toString() ?? "",
      fixedCct: f.fixedCct?.toString() ?? "",
      modifiersOwned: f.modifiersOwned.join(", "),
      controlMethod: f.controlMethod ?? "manual",
      bestUses: f.bestUses.join(", "),
      roomSizeRating: f.roomSizeRating ?? "medium",
      userNotes: f.userNotes ?? "",
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24">
      <Link href="/scout" className="mb-4 inline-flex items-center text-sm text-violet-600">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Shot Scout
      </Link>
      <PageHeader title="Lighting gear" subtitle="Save your actual fixtures — plans use brand, CCT range, and modifiers." />

      <div className="mb-6">
        <InfoCallout variant="blue">
          CineScout assigns your real lights to key, fill, hair, and practical roles. Daylight-only fixtures
          keep fixed CCT; bi-color fixtures get CCT within their range.
        </InfoCallout>
      </div>

      {fixtures.length === 0 && !loading && (
        <Button onClick={() => void seedCatalog()} disabled={saving} className="mb-6">
          Add example fixtures (Amaran, SmallRig, practical)
        </Button>
      )}

      <PageSection icon={Lightbulb} title={editingId ? "Edit fixture" : "Add fixture"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <Input label="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <Select
            label="Fixture type"
            value={form.fixtureType}
            onChange={(e) => setForm({ ...form, fixtureType: e.target.value as LightFixtureType })}
            options={FIXTURE_TYPES}
          />
          <Select
            label="Color type"
            value={form.colorType}
            onChange={(e) => setForm({ ...form, colorType: e.target.value as LightColorType })}
            options={COLOR_TYPES}
          />
          <Input label="Wattage" value={form.wattage} onChange={(e) => setForm({ ...form, wattage: e.target.value })} />
          <Input label="Fixed CCT (daylight only)" value={form.fixedCct} onChange={(e) => setForm({ ...form, fixedCct: e.target.value })} />
          <Input label="CCT min" value={form.cctMin} onChange={(e) => setForm({ ...form, cctMin: e.target.value })} />
          <Input label="CCT max" value={form.cctMax} onChange={(e) => setForm({ ...form, cctMax: e.target.value })} />
          <Input label="Modifiers owned" value={form.modifiersOwned} onChange={(e) => setForm({ ...form, modifiersOwned: e.target.value })} className="sm:col-span-2" />
          <Input label="Best uses (key, fill, hair…)" value={form.bestUses} onChange={(e) => setForm({ ...form, bestUses: e.target.value })} className="sm:col-span-2" />
          <Textarea label="Notes" value={form.userNotes} onChange={(e) => setForm({ ...form, userNotes: e.target.value })} className="sm:col-span-2" />
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => void save()} disabled={saving}>
            {editingId ? "Update" : "Save fixture"}
          </Button>
          {editingId && (
            <Button variant="secondary" onClick={() => { setEditingId(null); setForm(EMPTY); }}>
              Cancel
            </Button>
          )}
        </div>
      </PageSection>

      {loading ? (
        <LoadingSpinner className="py-12" />
      ) : (
        <div className="mt-8 space-y-3">
          {fixtures.map((f) => (
            <div key={f.id} className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div>
                <p className="font-semibold">{f.brand} {f.model}</p>
                <p className="text-sm text-slate-500 capitalize">
                  {f.fixtureType} · {f.colorType.replace(/_/g, " ")}
                  {f.fixedCct ? ` · ${f.fixedCct}K fixed` : f.cctMin && f.cctMax ? ` · ${f.cctMin}–${f.cctMax}K` : ""}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Modifiers: {f.modifiersOwned.join(", ") || "—"} · Best: {f.bestUses.join(", ")}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" onClick={() => edit(f)}>Edit</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => user?.uid && void deleteLightFixture(user.uid, f.id).then(load)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Link href="/settings/scout-gear" className="mt-8 block text-sm text-violet-600 hover:underline">
        Camera gear profiles →
      </Link>
    </div>
  );
}
