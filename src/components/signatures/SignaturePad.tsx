"use client";

import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface SignaturePadProps {
  label?: string;
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  className?: string;
  large?: boolean;
}

export function SignaturePad({
  label,
  onSave,
  onClear,
  className,
  large = false,
}: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas>(null);

  const handleClear = () => {
    sigRef.current?.clear();
    onClear?.();
  };

  const handleSave = () => {
    if (sigRef.current?.isEmpty()) return;
    const dataUrl = sigRef.current?.toDataURL("image/png") || "";
    onSave(dataUrl);
  };

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>
      )}
      <div
        className={cn(
          "rounded-lg border-2 border-slate-300 bg-white overflow-hidden touch-none",
          large ? "h-48 md:h-56" : "h-32"
        )}
      >
        <SignatureCanvas
          ref={sigRef}
          canvasProps={{
            className: "w-full h-full",
            style: { width: "100%", height: "100%" },
          }}
          penColor="#1e293b"
        />
      </div>
      <div className="mt-3 flex gap-3">
        <Button variant="outline" size={large ? "touch" : "md"} onClick={handleClear}>
          Clear
        </Button>
        <Button size={large ? "touch" : "md"} onClick={handleSave}>
          Save Signature
        </Button>
      </div>
    </div>
  );
}
