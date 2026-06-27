"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PayeeTaxInfo } from "@/lib/types";
import { hasW9Document } from "@/lib/w9/payeeTax";
import {
  fetchAgreementW9,
  readPdfFileAsDataUrl,
  uploadSigningW9,
  uploadStaffW9,
} from "@/lib/w9/client";
import { formatDate } from "@/lib/utils/format";
import { FileUp, ExternalLink } from "lucide-react";

interface W9UploadFieldProps {
  agreementId: string;
  tax?: PayeeTaxInfo;
  disabled?: boolean;
  /** Public signing link token — when set, uploads via signer API */
  signingToken?: string;
  onUploaded?: () => void;
}

export function W9UploadField({
  agreementId,
  tax,
  disabled,
  signingToken,
  onUploaded,
}: W9UploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = tax?.w9OnFile || hasW9Document(tax);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const pdfDataUrl = await readPdfFileAsDataUrl(file);
      if (signingToken) {
        await uploadSigningW9(signingToken, pdfDataUrl, file.name);
      } else {
        await uploadStaffW9(agreementId, pdfDataUrl, file.name);
      }
      onUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload W-9");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const openW9 = async () => {
    if (signingToken) return;
    setLoadingLink(true);
    setError(null);
    try {
      const w9 = await fetchAgreementW9(agreementId);
      window.open(w9.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open W-9");
    } finally {
      setLoadingLink(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">W-9 PDF</p>
          <p className="text-xs text-slate-500">
            Upload a completed IRS Form W-9. Stored securely — not included in the agreement PDF.
          </p>
        </div>
        <Badge variant={onFile ? "success" : "warning"}>{onFile ? "W-9 on file" : "No W-9 uploaded"}</Badge>
      </div>

      {onFile && tax?.w9UploadedAt && (
        <p className="mb-3 text-xs text-slate-500">
          Uploaded {formatDate(tax.w9UploadedAt)}
          {tax.w9FileName ? ` · ${tax.w9FileName}` : ""}
          {tax.w9UploadedBy === "signer" ? " · Via signing link" : tax.w9UploadedBy === "staff" ? " · Staff upload" : ""}
        </p>
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          <FileUp className="mr-2 h-4 w-4" />
          {uploading ? "Uploading…" : onFile ? "Replace W-9" : "Upload W-9 PDF"}
        </Button>
        {onFile && !signingToken && (
          <Button type="button" size="sm" variant="ghost" disabled={loadingLink} onClick={() => void openW9()}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {loadingLink ? "Opening…" : "View PDF"}
          </Button>
        )}
      </div>
    </div>
  );
}
