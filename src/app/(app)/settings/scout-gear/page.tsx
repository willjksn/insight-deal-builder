"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Camera } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { InfoCallout, PageSection } from "@/components/ui/PageSection";
import { useAuth } from "@/contexts/AuthContext";
import {
  createGearProfile,
  deleteGearProfile,
  getGearProfiles,
  updateGearProfile,
} from "@/lib/firebase/scoutFirestore";
import { ScoutGearProfile } from "@/lib/scout/types";
import { canUseShotScout } from "@/lib/utils/permissions";

function linesToArray(s: string): string[] {
  return s
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function arrayToLines(a: string[]): string {
  return a.join(", ");
}

const EMPTY = {
  name: "",
  cameraBodies: "Sony FX3",
  lenses: "35mm, 50mm, 85mm",
  lights: "Amaran 120d, SmallRig 30W COB",
  modifiers: "Softbox, diffusion",
  audio: "Rode Wireless GO II",
  stabilizers: "Tripod, gimbal",
  preferredProfiles: "S-Cinetone",
  preferredFrameRates: "24, 30",
};

export default function ScoutGearSettingsPage() {
  const { user, appUser } = useAuth();
  const [profiles, setProfiles] = useState<ScoutGearProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      setProfiles(await getGearProfiles(user.uid));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user?.uid]);

  if (!canUseShotScout(appUser)) {
    return (
      <div className="py-20 text-center text-slate-500">Shot Scout gear profiles require scout access.</div>
    );
  }

  const save = async () => {
    if (!user?.uid || !form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      cameraBodies: linesToArray(form.cameraBodies),
      lenses: linesToArray(form.lenses),
      lights: linesToArray(form.lights),
      modifiers: linesToArray(form.modifiers),
      audio: linesToArray(form.audio),
      stabilizers: linesToArray(form.stabilizers),
      preferredProfiles: linesToArray(form.preferredProfiles),
      preferredFrameRates: linesToArray(form.preferredFrameRates)
        .map(Number)
        .filter((n) => Number.isFinite(n)),
    };
    try {
      if (editingId) {
        await updateGearProfile(user.uid, editingId, payload);
      } else {
        await createGearProfile(user.uid, payload);
      }
      setForm(EMPTY);
      setEditingId(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (p: ScoutGearProfile) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      cameraBodies: arrayToLines(p.cameraBodies),
      lenses: arrayToLines(p.lenses),
      lights: arrayToLines(p.lights),
      modifiers: arrayToLines(p.modifiers),
      audio: arrayToLines(p.audio),
      stabilizers: arrayToLines(p.stabilizers),
      preferredProfiles: arrayToLines(p.preferredProfiles),
      preferredFrameRates: arrayToLines(p.preferredFrameRates.map(String)),
    });
  };

  return (
    <div>
      <Link href="/settings" className="mb-4 inline-flex items-center text-sm text-sky-700">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Settings
      </Link>

      <PageHeader
        title="Scout gear profiles"
        subtitle="Save camera kits for Sony FX3, lenses, lights, and audio — used in Shot Scout sessions"
      />

      <PageSection
        className="mb-8"
        icon={Camera}
        accent="violet"
        title="Your kits"
        description="Comma-separated lists are fine"
      >
        {loading ? (
          <LoadingSpinner className="py-8" />
        ) : profiles.length === 0 ? (
          <InfoCallout variant="blue">No gear profiles yet. Create one below.</InfoCallout>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {profiles.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.cameraBodies.join(", ")}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => user?.uid && void deleteGearProfile(user.uid, p.id).then(load)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PageSection>

      <PageSection icon={Camera} accent="violet" title={editingId ? "Edit profile" : "New profile"}>
        <div className="grid gap-4 max-w-lg">
          <Input label="Profile name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} touch />
          <Input label="Camera bodies" value={form.cameraBodies} onChange={(e) => setForm({ ...form, cameraBodies: e.target.value })} touch />
          <Input label="Lenses" value={form.lenses} onChange={(e) => setForm({ ...form, lenses: e.target.value })} touch />
          <Input label="Lights" value={form.lights} onChange={(e) => setForm({ ...form, lights: e.target.value })} touch />
          <Input label="Modifiers" value={form.modifiers} onChange={(e) => setForm({ ...form, modifiers: e.target.value })} touch />
          <Input label="Audio" value={form.audio} onChange={(e) => setForm({ ...form, audio: e.target.value })} touch />
          <Input label="Stabilizers" value={form.stabilizers} onChange={(e) => setForm({ ...form, stabilizers: e.target.value })} touch />
          <Input label="Picture profiles" value={form.preferredProfiles} onChange={(e) => setForm({ ...form, preferredProfiles: e.target.value })} touch />
          <Input label="Frame rates" value={form.preferredFrameRates} onChange={(e) => setForm({ ...form, preferredFrameRates: e.target.value })} touch />
          <div className="flex gap-2">
            <Button onClick={() => void save()} disabled={saving}>
              <Plus className="mr-2 h-4 w-4" />
              {editingId ? "Save" : "Add profile"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={() => { setEditingId(null); setForm(EMPTY); }}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </PageSection>
    </div>
  );
}
