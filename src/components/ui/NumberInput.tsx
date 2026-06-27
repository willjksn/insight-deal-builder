"use client";

import { useEffect, useState } from "react";
import { Input, InputProps } from "@/components/ui/Input";

interface NumberInputProps extends Omit<InputProps, "type" | "value" | "onChange"> {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

function formatValue(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return String(value);
}

function parseValue(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === ".") return undefined;
  const n = Number(trimmed);
  return Number.isNaN(n) ? undefined : n;
}

/** Text-based numeric field so users can type freely (unlike controlled type="number"). */
export function NumberInput({ value, onChange, onBlur, onFocus, ...props }: NumberInputProps) {
  const [text, setText] = useState(() => formatValue(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatValue(value));
    }
  }, [value, focused]);

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={text}
      onFocus={(e) => {
        setFocused(true);
        setText(formatValue(value));
        onFocus?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
        setText(raw);
        onChange(parseValue(raw));
      }}
      onBlur={(e) => {
        setFocused(false);
        const parsed = parseValue(text);
        onChange(parsed);
        setText(formatValue(parsed));
        onBlur?.(e);
      }}
    />
  );
}
