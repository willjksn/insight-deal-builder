"use client";

import { useEffect, useState } from "react";

const ROLE_PRESETS = [
  { value: "CAMERA_A", label: "Camera A" },
  { value: "CAMERA_B", label: "Camera B" },
  { value: "CAMERA_C", label: "Camera C" },
  { value: "AUDIO", label: "Audio" },
  { value: "DRONE", label: "Drone" },
  { value: "CUSTOM", label: "Custom name…" },
] as const;

type RoleValue = (typeof ROLE_PRESETS)[number]["value"];

const PRESET_VALUES = new Set<string>(["CAMERA_A", "CAMERA_B", "CAMERA_C", "AUDIO", "DRONE"]);

/** True when value is a built-in role (not a custom folder name). */
export function isCameraRolePreset(value: string): boolean {
  return PRESET_VALUES.has(value.trim().toUpperCase());
}

function roleFromValue(value: string): RoleValue {
  const n = value.trim().toUpperCase();
  if (PRESET_VALUES.has(n)) return n as RoleValue;
  return "CUSTOM";
}

type Props = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  /** e.g. "Sony FX3" — shown next to matching role */
  detectedModel?: string | null;
  suggestedRole?: string | null;
  idPrefix?: string;
};

/**
 * Role preset + free-text camera/folder name (e.g. FX30_B, A7IV).
 * The name is what gets used for 01_ORIGINAL_MEDIA folders.
 */
export function CameraLabelPicker({
  value,
  onChange,
  disabled,
  detectedModel,
  suggestedRole,
  idPrefix = "camera",
}: Props) {
  const [role, setRole] = useState<RoleValue>(() => roleFromValue(value));

  useEffect(() => {
    if (isCameraRolePreset(value)) {
      setRole(value.trim().toUpperCase() as RoleValue);
    }
  }, [value]);

  return (
    <div className="space-y-3">
      <label className="block text-sm" htmlFor={`${idPrefix}-role`}>
        <span className="mb-1 block text-slate-600">Assign as</span>
        <select
          id={`${idPrefix}-role`}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          value={role}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value as RoleValue;
            setRole(next);
            if (next === "CUSTOM") {
              if (isCameraRolePreset(value) || !value.trim()) {
                onChange("");
              }
              return;
            }
            onChange(
              detectedModel ? suggestNameFromModel(detectedModel, next) : next
            );
          }}
        >
          {ROLE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
              {detectedModel &&
              suggestedRole &&
              p.value === suggestedRole.toUpperCase() &&
              p.value !== "CUSTOM"
                ? ` — ${detectedModel}`
                : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm" htmlFor={`${idPrefix}-name`}>
        <span className="mb-1 block text-slate-600">
          Camera name{" "}
          <span className="font-normal text-slate-400">(folder on disk)</span>
        </span>
        <input
          id={`${idPrefix}-name`}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            detectedModel
              ? `e.g. ${suggestNameFromModel(detectedModel, role === "CUSTOM" ? "CAMERA_B" : role)}`
              : "e.g. FX30_B, A7IV, Camera_D"
          }
          autoComplete="off"
          spellCheck={false}
        />
        <p className="mt-1 text-[11px] text-slate-500">
          Use distinct names when you have two of the same body — e.g.{" "}
          <span className="font-mono">FX30_B</span> and{" "}
          <span className="font-mono">FX30_C</span>. Spaces become underscores.
        </p>
      </label>
    </div>
  );
}

function suggestNameFromModel(model: string, role: string): string {
  const short = model
    .replace(/^Sony\s+/i, "")
    .replace(/^Zoom\s+/i, "")
    .replace(/\s+/g, "");
  if (!short) return role;
  if (role === "CAMERA_A") return `${short}_A`;
  if (role === "CAMERA_B") return `${short}_B`;
  if (role === "CAMERA_C") return `${short}_C`;
  if (role === "AUDIO") return "Audio";
  if (role === "DRONE") return "Drone";
  return short;
}
