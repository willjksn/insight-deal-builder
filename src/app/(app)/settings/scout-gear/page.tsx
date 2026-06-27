"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Camera, List, Copy } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { InfoCallout, PageSection } from "@/components/ui/PageSection";
import { useAuth } from "@/contexts/AuthContext";
import {
  createGearProfile,
  deleteGearProfile,
  getGearList,
  getGearProfiles,
  saveGearList,
  updateGearProfile,
} from "@/lib/firebase/scoutFirestore";
import { gearListHasItems } from "@/lib/scout/gearContext";
import { ScoutGearList, ScoutGearProfile } from "@/lib/scout/types";
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

type GearFields = {
  cameraBodies: string;
  lenses: string;
  lights: string;
  modifiers: string;
  audio: string;
  stabilizers: string;
  preferredProfiles: string;
  preferredFrameRates: string;
};

const EMPTY_GEAR: GearFields = {
  cameraBodies: "",
  lenses: "",
  lights: "",
  modifiers: "",
  audio: "",
  stabilizers: "",
  preferredProfiles: "",
  preferredFrameRates: "",
};

const EMPTY_PROFILE = {
  name: "",
  ...EMPTY_GEAR,
};

function gearListToForm(list: ScoutGearList): GearFields {
  return {
    cameraBodies: arrayToLines(list.cameraBodies),
    lenses: arrayToLines(list.lenses),
    lights: arrayToLines(list.lights),
    modifiers: arrayToLines(list.modifiers),
    audio: arrayToLines(list.audio),
    stabilizers: arrayToLines(list.stabilizers),
    preferredProfiles: arrayToLines(list.preferredProfiles ?? []),
    preferredFrameRates: arrayToLines((list.preferredFrameRates ?? []).map(String)),
  };
}

function payloadFromGearFields(fields: GearFields) {
  return {
    cameraBodies: linesToArray(fields.cameraBodies),
    lenses: linesToArray(fields.lenses),
    lights: linesToArray(fields.lights),
    modifiers: linesToArray(fields.modifiers),
    audio: linesToArray(fields.audio),
    stabilizers: linesToArray(fields.stabilizers),
    preferredProfiles: linesToArray(fields.preferredProfiles),
    preferredFrameRates: linesToArray(fields.preferredFrameRates)
      .map(Number)
      .filter((n) => Number.isFinite(n)),
  };
}

function GearSummary({ list }: { list: ScoutGearList | null }) {
  if (!gearListHasItems(list)) {
    return (
      <InfoCallout variant="blue">
        Add everything you own below. Shot Scout AI will only suggest gear from this list.
      </InfoCallout>
    );
  }

  const groups: { label: string; items: string[] }[] = [
    { label: "Cameras", items: list!.cameraBodies },
    { label: "Lenses", items: list!.lenses },
    { label: "Lights", items: list!.lights },
    { label: "Modifiers", items: list!.modifiers },
    { label: "Audio", items: list!.audio },
    { label: "Stabilization", items: list!.stabilizers },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {group.items.map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs text-slate-700"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ScoutGearSettingsPage() {
  const { user, appUser } = useAuth();
  const [profiles, setProfiles] = useState<ScoutGearProfile[]>([]);
  const [gearList, setGearList] = useState<ScoutGearList | null>(null);
  const [loading, setLoading] = useState(true);
  const [gearForm, setGearForm] = useState(EMPTY_GEAR);
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingList, setSavingList] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [list, loadedProfiles] = await Promise.all([
        getGearList(user.uid),
        getGearProfiles(user.uid),
      ]);
      setGearList(list);
      setProfiles(loadedProfiles);
      if (list) setGearForm(gearListToForm(list));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user?.uid]);

  const savedListPreview = useMemo(() => {
    if (!gearListHasItems(gearList)) return null;
    return gearList;
  }, [gearList]);

  if (!canUseShotScout(appUser)) {
    return (
      <div className="py-20 text-center text-slate-500">Shot Scout gear requires scout access.</div>
    );
  }

  const saveGearListForm = async () => {
    if (!user?.uid) return;
    setSavingList(true);
    try {
      await saveGearList(user.uid, payloadFromGearFields(gearForm));
      await load();
    } finally {
      setSavingList(false);
    }
  };

  const saveProfile = async () => {
    if (!user?.uid || !profileForm.name.trim()) return;
    setSavingProfile(true);
    const payload = {
      name: profileForm.name.trim(),
      ...payloadFromGearFields(profileForm),
    };
    try {
      if (editingId) {
        await updateGearProfile(user.uid, editingId, payload);
      } else {
        await createGearProfile(user.uid, payload);
      }
      setProfileForm(EMPTY_PROFILE);
      setEditingId(null);
      await load();
    } finally {
      setSavingProfile(false);
    }
  };

  const startEditProfile = (p: ScoutGearProfile) => {
    setEditingId(p.id);
    setProfileForm({
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

  const copyGearListToProfile = () => {
    setProfileForm((f) => ({
      ...f,
      cameraBodies: gearForm.cameraBodies,
      lenses: gearForm.lenses,
      lights: gearForm.lights,
      modifiers: gearForm.modifiers,
      audio: gearForm.audio,
      stabilizers: gearForm.stabilizers,
      preferredProfiles: gearForm.preferredProfiles,
      preferredFrameRates: gearForm.preferredFrameRates,
    }));
  };

  const gearFields = (
    fields: GearFields,
    setFields: (next: GearFields) => void,
    idPrefix: string
  ) => (
    <>
      <Input
        label="Camera bodies"
        value={fields.cameraBodies}
        onChange={(e) => setFields({ ...fields, cameraBodies: e.target.value })}
        placeholder="Sony FX3, Sony A7IV"
        touch
        id={`${idPrefix}-cameras`}
      />
      <Input
        label="Lenses"
        value={fields.lenses}
        onChange={(e) => setFields({ ...fields, lenses: e.target.value })}
        placeholder="35mm, 50mm, 85mm"
        touch
        id={`${idPrefix}-lenses`}
      />
      <Input
        label="Lights"
        value={fields.lights}
        onChange={(e) => setFields({ ...fields, lights: e.target.value })}
        placeholder="Amaran 120d, SmallRig 30W COB"
        touch
        id={`${idPrefix}-lights`}
      />
      <Input
        label="Modifiers"
        value={fields.modifiers}
        onChange={(e) => setFields({ ...fields, modifiers: e.target.value })}
        placeholder="Softbox, diffusion, flags"
        touch
        id={`${idPrefix}-modifiers`}
      />
      <Input
        label="Audio"
        value={fields.audio}
        onChange={(e) => setFields({ ...fields, audio: e.target.value })}
        placeholder="Rode Wireless GO II"
        touch
        id={`${idPrefix}-audio`}
      />
      <Input
        label="Stabilization"
        value={fields.stabilizers}
        onChange={(e) => setFields({ ...fields, stabilizers: e.target.value })}
        placeholder="Tripod, DJI RS3 Mini"
        touch
        id={`${idPrefix}-stabilizers`}
      />
      <Input
        label="Picture profiles"
        value={fields.preferredProfiles}
        onChange={(e) => setFields({ ...fields, preferredProfiles: e.target.value })}
        placeholder="S-Cinetone, S-Log3"
        touch
        id={`${idPrefix}-profiles`}
      />
      <Input
        label="Frame rates"
        value={fields.preferredFrameRates}
        onChange={(e) => setFields({ ...fields, preferredFrameRates: e.target.value })}
        placeholder="24, 30, 60"
        touch
        id={`${idPrefix}-fps`}
      />
    </>
  );

  return (
    <div>
      <Link href="/scout" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:text-sky-900">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Shot Scout
      </Link>

      <PageHeader
        title="My gear & kits"
        subtitle="Build your master gear list first — AI suggests camera and lighting from what you own. Save named kits for quick session setup."
      />

      <PageSection
        className="mb-8"
        icon={List}
        accent="sky"
        title="My gear list"
        description="Everything you own. Comma-separated is fine."
      >
        {loading ? (
          <LoadingSpinner className="py-8" />
        ) : (
          <div className="space-y-6">
            <GearSummary list={savedListPreview} />
            <div className="grid max-w-lg gap-4">
              {gearFields(gearForm, setGearForm, "gear-list")}
              <Button onClick={() => void saveGearListForm()} disabled={savingList}>
                {savingList ? "Saving…" : gearListHasItems(gearList) ? "Update gear list" : "Save gear list"}
              </Button>
            </div>
          </div>
        )}
      </PageSection>

      <PageSection
        className="mb-8"
        icon={Camera}
        accent="violet"
        title="Gear kits"
        description="Named profiles for common setups — usually a subset of your gear list"
      >
        {loading ? (
          <LoadingSpinner className="py-8" />
        ) : profiles.length === 0 ? (
          <InfoCallout variant="blue">No kits yet. Create one below to reuse on scout sessions.</InfoCallout>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {profiles.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {[...p.cameraBodies, ...p.lenses.slice(0, 2)].filter(Boolean).join(" · ") || "No gear listed"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEditProfile(p)}>
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

      <PageSection icon={Camera} accent="violet" title={editingId ? "Edit kit" : "New kit"}>
        <div className="grid max-w-lg gap-4">
          <Input
            label="Kit name"
            value={profileForm.name}
            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
            placeholder="FX3 interview kit"
            touch
          />
          {gearListHasItems(gearList) && (
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={copyGearListToProfile}>
              <Copy className="mr-2 h-4 w-4" />
              Copy from gear list
            </Button>
          )}
          {gearFields(profileForm, (next) => setProfileForm((f) => ({ ...f, ...next })), "profile")}
          <div className="flex gap-2">
            <Button onClick={() => void saveProfile()} disabled={savingProfile}>
              <Plus className="mr-2 h-4 w-4" />
              {editingId ? "Save kit" : "Add kit"}
            </Button>
            {editingId && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setProfileForm(EMPTY_PROFILE);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </PageSection>
    </div>
  );
}
