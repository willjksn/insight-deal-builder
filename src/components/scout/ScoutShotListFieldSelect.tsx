"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  isPresetShotListValue,
  SCOUT_SHOT_FIELD_CUSTOM,
  ShotListSelectOption,
} from "@/lib/scout/shotListFieldOptions";

interface ScoutShotListFieldSelectProps {
  label: string;
  value: string;
  options: ShotListSelectOption[];
  customPlaceholder: string;
  onChange: (value: string) => void;
}

export function ScoutShotListFieldSelect({
  label,
  value,
  options,
  customPlaceholder,
  onChange,
}: ScoutShotListFieldSelectProps) {
  const valueIsPreset = isPresetShotListValue(value, options);
  const [customMode, setCustomMode] = useState(
    () => Boolean(value.trim()) && !valueIsPreset
  );

  const showCustom = customMode || (Boolean(value.trim()) && !valueIsPreset);
  const selectValue = showCustom ? SCOUT_SHOT_FIELD_CUSTOM : value.trim();

  return (
    <div className="space-y-2">
      <Select
        label={label}
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          if (next === SCOUT_SHOT_FIELD_CUSTOM) {
            setCustomMode(true);
            return;
          }
          setCustomMode(false);
          onChange(next);
        }}
        options={options}
      />
      {showCustom ? (
        <Input
          label={`Custom ${label.toLowerCase()}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={customPlaceholder}
        />
      ) : null}
    </div>
  );
}
