import { ScoutGearProfile } from "@/lib/scout/types";
import { ScoutSessionFormValues } from "@/lib/scout/sessionForm";

export function gearFieldOptions(
  items: string[],
  allLabel = "All in kit"
): { value: string; label: string }[] {
  const unique = [...new Set(items.map((s) => s.trim()).filter(Boolean))];
  if (unique.length === 0) return [{ value: "", label: "—" }];
  if (unique.length === 1) return [{ value: unique[0], label: unique[0] }];
  return [
    { value: unique.join(", "), label: allLabel },
    ...unique.map((v) => ({ value: v, label: v })),
  ];
}

export function lightingOptionsFromProfile(profile: ScoutGearProfile): { value: string; label: string }[] {
  const lights = profile.lights ?? [];
  const modifiers = profile.modifiers ?? [];
  const combined = [...lights, ...modifiers.filter((m) => !lights.includes(m))];
  return gearFieldOptions(combined, "All lights & modifiers");
}

export function stabilizerOptionsFromProfile(profile: ScoutGearProfile): { value: string; label: string }[] {
  return gearFieldOptions(
    [...(profile.stabilizers ?? []), ...(profile.tripods ?? [])],
    "All stabilization"
  );
}

export function formValuesFromGearProfile(profile: ScoutGearProfile): Partial<ScoutSessionFormValues> {
  const cameraOpts = gearFieldOptions(profile.cameraBodies);
  const lensOpts = gearFieldOptions(profile.lenses);
  const lightOpts = lightingOptionsFromProfile(profile);
  const audioOpts = gearFieldOptions(profile.audio);
  const stabOpts = stabilizerOptionsFromProfile(profile);

  return {
    selectedGearProfileId: profile.id,
    cameraBody: cameraOpts[0]?.value ?? "",
    lensOptions: lensOpts[0]?.value ?? "",
    lightingGear: lightOpts[0]?.value ?? "",
    audioGear: audioOpts[0]?.value ?? "",
    stabilizationGear: stabOpts[0]?.value ?? "",
  };
}

export function buildGearKitSelectOptions(
  gearProfiles: ScoutGearProfile[],
  recentProfileIds: string[]
): { value: string; label: string; disabled?: boolean }[] {
  const byId = new Map(gearProfiles.map((p) => [p.id, p]));
  const options: { value: string; label: string; disabled?: boolean }[] = [
    { value: "", label: "Choose a gear kit…" },
  ];

  const recent = recentProfileIds
    .map((id) => byId.get(id))
    .filter((p): p is ScoutGearProfile => Boolean(p));

  if (recent.length > 0) {
    options.push({ value: "__hdr_recent__", label: "Recently used", disabled: true });
    for (const p of recent) {
      options.push({ value: p.id, label: p.name });
    }
  }

  const recentSet = new Set(recent.map((p) => p.id));
  const saved = gearProfiles.filter((p) => !recentSet.has(p.id));

  if (saved.length > 0) {
    options.push({ value: "__hdr_saved__", label: "Saved profiles", disabled: true });
    for (const p of saved) {
      options.push({ value: p.id, label: p.name });
    }
  }

  if (gearProfiles.length === 0) {
    options.push({ value: "__custom__", label: "Custom kit (no profiles yet)" });
  } else {
    options.push({ value: "__hdr_custom__", label: "Other", disabled: true });
    options.push({ value: "__custom__", label: "Custom kit — enter manually" });
  }

  return options;
}
