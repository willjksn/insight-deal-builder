"use client";

import { useEffect, useMemo, useState, Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ScoutCard } from "@/components/scout/ScoutShell";
import { useAuth } from "@/contexts/AuthContext";
import { getRecentGearProfileIds, getGearList } from "@/lib/firebase/scoutFirestore";
import { scoutSuggestGear } from "@/lib/scout/apiClient";
import { buildGearInventory, gearListHasItems } from "@/lib/scout/gearContext";
import { ScoutGearList } from "@/lib/scout/types";
import {
  buildGearKitSelectOptions,
  formValuesFromGearProfile,
  gearFieldOptions,
  lightingOptionsFromProfile,
  stabilizerOptionsFromProfile,
} from "@/lib/scout/gearPickerUtils";
import { ScoutSessionFormValues } from "@/lib/scout/sessionForm";
import { ScoutGearProfile } from "@/lib/scout/types";

type Props = {
  form: ScoutSessionFormValues;
  onChange: Dispatch<SetStateAction<ScoutSessionFormValues>>;
  gearProfiles: ScoutGearProfile[];
};

export function ScoutGearPicker({ form, onChange, gearProfiles }: Props) {
  const { user } = useAuth();
  const [recentProfileIds, setRecentProfileIds] = useState<string[]>([]);
  const [gearList, setGearList] = useState<ScoutGearList | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestRationale, setSuggestRationale] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    getRecentGearProfileIds(user.uid)
      .then(setRecentProfileIds)
      .catch(() => setRecentProfileIds([]));
    getGearList(user.uid)
      .then(setGearList)
      .catch(() => setGearList(null));
  }, [user?.uid]);

  const kitSelectValue = form.selectedGearProfileId
    ? form.selectedGearProfileId
    : form.cameraBody || form.lensOptions
      ? "__custom__"
      : "";

  const selectedProfile = gearProfiles.find((p) => p.id === form.selectedGearProfileId);
  const showManualFields =
    gearProfiles.length === 0 || kitSelectValue === "__custom__" || (!selectedProfile && kitSelectValue !== "");

  const kitOptions = useMemo(
    () => buildGearKitSelectOptions(gearProfiles, recentProfileIds),
    [gearProfiles, recentProfileIds]
  );

  const set = <K extends keyof ScoutSessionFormValues>(key: K, value: ScoutSessionFormValues[K]) => {
    onChange((prev) => ({ ...prev, [key]: value }));
  };

  const onKitChange = (value: string) => {
    if (value.startsWith("__")) return;
    if (value === "__custom__" || value === "") {
      onChange((prev) => ({ ...prev, selectedGearProfileId: "" }));
      return;
    }
    const profile = gearProfiles.find((p) => p.id === value);
    if (!profile) return;
    onChange((prev) => ({ ...prev, ...formValuesFromGearProfile(profile) }));
  };

  const cameraOptions = selectedProfile
    ? gearFieldOptions(selectedProfile.cameraBodies)
    : [];
  const lensOptions = selectedProfile ? gearFieldOptions(selectedProfile.lenses) : [];
  const lightOptions = selectedProfile ? lightingOptionsFromProfile(selectedProfile) : [];
  const audioOptions = selectedProfile ? gearFieldOptions(selectedProfile.audio) : [];
  const stabOptions = selectedProfile ? stabilizerOptionsFromProfile(selectedProfile) : [];

  const hasInventory = useMemo(() => {
    const inventory = buildGearInventory(
      {
        cameraBody: form.cameraBody,
        lensOptions: form.lensOptions,
        lightingGear: form.lightingGear,
        audioGear: form.audioGear,
        stabilizationGear: form.stabilizationGear,
      } as import("@/lib/scout/types").ScoutProject,
      selectedProfile,
      gearList
    );
    return (
      inventory.cameraBodies.length +
        inventory.lenses.length +
        inventory.lights.length +
        inventory.audio.length +
        inventory.stabilization.length >
        0 || gearListHasItems(gearList)
    );
  }, [form, selectedProfile, gearList]);

  const canSuggest = Boolean(form.sceneIdea.trim()) && hasInventory;

  const handleSuggestGear = async () => {
    if (!canSuggest) return;
    setSuggesting(true);
    setSuggestError(null);
    setSuggestRationale(null);
    try {
      const suggestion = await scoutSuggestGear({
        sceneIdea: form.sceneIdea,
        sceneType: form.sceneType,
        mood: form.mood,
        theme: form.theme,
        platform: form.platform,
        aspectRatio: form.aspectRatio,
        skillLevel: form.skillLevel,
        preferredLook: form.preferredLook,
        selectedGearProfileId: form.selectedGearProfileId || undefined,
        cameraBody: form.cameraBody,
        lensOptions: form.lensOptions,
        lightingGear: form.lightingGear,
        audioGear: form.audioGear,
        stabilizationGear: form.stabilizationGear,
      });
      onChange((prev) => ({
        ...prev,
        cameraBody: suggestion.cameraBody,
        lensOptions: suggestion.lensOptions,
        lightingGear: suggestion.lightingGear,
        audioGear: suggestion.audioGear,
        stabilizationGear: suggestion.stabilizationGear,
      }));
      setSuggestRationale(suggestion.rationale);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "Could not suggest gear");
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <ScoutCard className="space-y-4">
      <div>
        <h2 className="font-semibold text-slate-900">Camera &amp; gear</h2>
        <p className="mt-1 text-xs text-slate-500">
          Pick a saved kit or one you used on a recent scout, then narrow each category for this session.
          Describe your scene idea above, then use Suggest gear to get camera and lighting picks from your kit.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canSuggest || suggesting}
          onClick={() => void handleSuggestGear()}
        >
          <Sparkles className="mr-1.5 h-4 w-4" />
          {suggesting ? "Suggesting…" : "Suggest gear for this scene"}
        </Button>
        {!form.sceneIdea.trim() && (
          <span className="text-xs text-slate-500">Add a scene idea first.</span>
        )}
        {form.sceneIdea.trim() && !hasInventory && (
          <span className="text-xs text-slate-500">
            <Link href="/settings/scout-gear" className="text-sky-600 hover:underline">
              Add your gear list
            </Link>{" "}
            or select a kit first.
          </span>
        )}
      </div>

      {suggestRationale && (
        <p className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-900">
          {suggestRationale}
        </p>
      )}
      {suggestError && <p className="text-xs text-red-500">{suggestError}</p>}

      <Select
        label="Gear kit for this session"
        value={kitSelectValue === "" ? "" : kitSelectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v.startsWith("__hdr_")) return;
          if (v === "") {
            onChange((prev) => ({ ...prev, selectedGearProfileId: "" }));
            return;
          }
          if (v === "__custom__") {
            onChange((prev) => ({ ...prev, selectedGearProfileId: "" }));
            return;
          }
          onKitChange(v);
        }}
        options={kitOptions}
        touch
      />

      {selectedProfile && (
        <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3 space-y-4">
          <p className="text-xs font-medium text-sky-900">
            From profile: <span className="font-semibold">{selectedProfile.name}</span>
          </p>
          <Select
            label="Camera body"
            value={form.cameraBody}
            onChange={(e) => set("cameraBody", e.target.value)}
            options={cameraOptions}
            touch
          />
          <Select
            label="Lens"
            value={form.lensOptions}
            onChange={(e) => set("lensOptions", e.target.value)}
            options={lensOptions}
            touch
          />
          <Select
            label="Lights"
            value={form.lightingGear}
            onChange={(e) => set("lightingGear", e.target.value)}
            options={lightOptions}
            touch
          />
          <Select
            label="Audio"
            value={form.audioGear}
            onChange={(e) => set("audioGear", e.target.value)}
            options={audioOptions}
            touch
          />
          <Select
            label="Stabilization"
            value={form.stabilizationGear}
            onChange={(e) => set("stabilizationGear", e.target.value)}
            options={stabOptions}
            touch
          />
        </div>
      )}

      {(showManualFields && !selectedProfile) && (
        <div className="space-y-4">
          {gearProfiles.length > 0 && (
            <p className="text-xs text-slate-500">Custom kit — type gear for this session.</p>
          )}
          <Input
            label="Camera body"
            value={form.cameraBody}
            onChange={(e) => set("cameraBody", e.target.value)}
            touch
          />
          <Input
            label="Lenses"
            value={form.lensOptions}
            onChange={(e) => set("lensOptions", e.target.value)}
            touch
          />
          <Input
            label="Lights"
            value={form.lightingGear}
            onChange={(e) => set("lightingGear", e.target.value)}
            touch
          />
          <Input
            label="Audio"
            value={form.audioGear}
            onChange={(e) => set("audioGear", e.target.value)}
            touch
          />
          <Input
            label="Stabilization"
            value={form.stabilizationGear}
            onChange={(e) => set("stabilizationGear", e.target.value)}
            touch
          />
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <Link href="/settings/scout-gear" className="text-sky-600 hover:underline">
          Manage gear list &amp; kits →
        </Link>
        <Link href="/settings/lights" className="text-sky-600 hover:underline">
          Lighting fixtures →
        </Link>
      </div>
    </ScoutCard>
  );
}
