"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Camera, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type IdSide = "front" | "back";

interface IdPhotoCaptureProps {
  frontImage: string | null;
  backImage: string | null;
  onFrontChange: (dataUrl: string | null) => void;
  onBackChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  className?: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

function IdSideCapture({
  side,
  label,
  hint,
  image,
  onChange,
  disabled,
}: {
  side: IdSide;
  label: string;
  hint: string;
  image: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const dataUrl = await readFileAsDataUrl(file);
    onChange(dataUrl);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="text-xs text-slate-500">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {image ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={`${side} of ID`}
            className="max-h-48 w-full rounded-lg border border-slate-200 object-contain bg-slate-50"
          />
          {!disabled && (
            <Button type="button" variant="outline" size="sm" onClick={() => onChange(null)}>
              <RotateCcw className="mr-2 h-4 w-4" /> Retake
            </Button>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="touch"
          className="w-full"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="mr-2 h-5 w-5" /> Take photo — {side}
        </Button>
      )}
    </div>
  );
}

export function IdPhotoCapture({
  frontImage,
  backImage,
  onFrontChange,
  onBackChange,
  disabled,
  className,
}: IdPhotoCaptureProps) {
  return (
    <div className={cn("grid gap-6 md:grid-cols-2", className)}>
      <IdSideCapture
        side="front"
        label="Front of ID"
        hint="Driver's license, passport, or other government-issued photo ID"
        image={frontImage}
        onChange={onFrontChange}
        disabled={disabled}
      />
      <IdSideCapture
        side="back"
        label="Back of ID"
        hint="Full back of the same ID — required for age verification"
        image={backImage}
        onChange={onBackChange}
        disabled={disabled}
      />
    </div>
  );
}

export function useIdPhotoCaptureState() {
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const ready = !!frontImage && !!backImage;
  const reset = () => {
    setFrontImage(null);
    setBackImage(null);
  };
  return { frontImage, backImage, setFrontImage, setBackImage, ready, reset };
}
