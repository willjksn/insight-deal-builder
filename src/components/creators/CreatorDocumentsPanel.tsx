"use client";

import { useState } from "react";
import { ExternalLink, Lock, Plus, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  CREATOR_DOCUMENT_KIND_LABELS,
  SENSITIVE_CREATOR_DOCUMENT_KINDS,
  type CreatorDocument,
  type CreatorDocumentKind,
} from "@/lib/creators/types";

const KIND_OPTIONS = (Object.keys(CREATOR_DOCUMENT_KIND_LABELS) as CreatorDocumentKind[])
  .filter((value) => value !== "w9")
  .map((value) => ({ value, label: CREATOR_DOCUMENT_KIND_LABELS[value] }));

type Props = {
  documents: CreatorDocument[];
  canEdit: boolean;
  canViewSensitive: boolean;
  saving?: boolean;
  onAdd: (input: {
    kind: CreatorDocumentKind;
    label?: string;
    url?: string;
    fileDataUrl?: string;
    fileName?: string;
  }) => Promise<void>;
  onRemove: (docId: string) => Promise<void>;
  onView: (docId: string) => Promise<void>;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function CreatorDocumentsPanel({
  documents,
  canEdit,
  canViewSensitive,
  saving,
  onAdd,
  onRemove,
  onView,
}: Props) {
  const [kind, setKind] = useState<CreatorDocumentKind>("media_kit");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensitiveKind = SENSITIVE_CREATOR_DOCUMENT_KINDS.includes(kind);

  const handleAdd = async () => {
    setError(null);
    if (sensitiveKind && !canViewSensitive) {
      setError("You don't have permission to upload sensitive documents.");
      return;
    }
    if (!url.trim() && !file) {
      setError("Add a URL or choose a file.");
      return;
    }
    setBusy(true);
    try {
      const fileDataUrl = file ? await fileToDataUrl(file) : undefined;
      await onAdd({
        kind,
        label: label.trim() || undefined,
        url: url.trim() || undefined,
        fileDataUrl,
        fileName: file?.name,
      });
      setLabel("");
      setUrl("");
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Documents</h2>
      </CardHeader>
      <CardBody className="space-y-4">
        {documents.length === 0 ? (
          <p className="text-sm text-slate-500">No documents yet.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => {
              const sensitive =
                doc.sensitive || SENSITIVE_CREATOR_DOCUMENT_KINDS.includes(doc.kind);
              const locked = sensitive && !canViewSensitive;
              return (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {doc.label || CREATOR_DOCUMENT_KIND_LABELS[doc.kind]}
                      </span>
                      <Badge variant={sensitive ? "warning" : "default"}>
                        {CREATOR_DOCUMENT_KIND_LABELS[doc.kind]}
                      </Badge>
                      {locked && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Lock className="h-3 w-3" /> Restricted
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!locked && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onView(doc.id)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    {canEdit && (!sensitive || canViewSensitive) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={saving}
                        onClick={() => onRemove(doc.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {canEdit && (
          <div className="space-y-3 rounded-xl border border-dashed border-slate-300 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Plus className="h-4 w-4" /> Add document
            </div>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <Select
                label="Kind"
                value={kind}
                options={KIND_OPTIONS}
                onChange={(e) => setKind(e.target.value as CreatorDocumentKind)}
                touch
              />
              <Input
                label="Label (optional)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                touch
              />
              {!sensitiveKind && (
                <div className="md:col-span-2">
                  <Input
                    label="URL"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://…"
                    touch
                  />
                </div>
              )}
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {sensitiveKind ? "Upload file (required for ID)" : "Or upload a file"}
                </label>
                <input
                  type="file"
                  className="block w-full text-sm text-slate-600"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  accept={
                    kind === "w9"
                      ? "application/pdf"
                      : kind === "id_verification"
                        ? "image/*,application/pdf"
                        : undefined
                  }
                />
              </div>
            </div>
            <Button type="button" size="touch" disabled={busy || saving} onClick={handleAdd}>
              {busy ? "Uploading…" : "Add document"}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
