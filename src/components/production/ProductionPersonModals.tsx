"use client";

import { useMemo, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { CrewMember } from "@/lib/types";
import { ProductionPerson, ProductionPersonGroup } from "@/lib/production/types";
import { PersonAvatar } from "@/components/production/PersonAvatar";
import Link from "next/link";

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="production-modal-title"
        className="relative flex max-h-[min(88vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="production-modal-title" className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function CrewPickerModal({
  crewCatalog,
  excludeCrewIds,
  onSelect,
  onClose,
}: {
  crewCatalog: CrewMember[];
  excludeCrewIds: string[];
  onSelect: (member: CrewMember) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const excluded = useMemo(() => new Set(excludeCrewIds.filter(Boolean)), [excludeCrewIds]);

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return crewCatalog.filter((c) => {
      if (excluded.has(c.id)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.defaultRole?.toLowerCase().includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [crewCatalog, excluded, query]);

  return (
    <ModalShell title="Add from crew catalog" onClose={onClose}>
      <p className="mb-4 text-sm text-slate-600">
        Pick someone from your Crew list. Their contact info will fill in automatically.
      </p>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, role, or email"
          className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
          autoFocus
        />
      </div>
      {available.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          {crewCatalog.length === 0 ? (
            <>
              No crew in catalog yet.{" "}
              <Link href="/crew" className="font-medium text-sky-700 hover:underline">
                Add crew members
              </Link>
            </>
          ) : excluded.size >= crewCatalog.length ? (
            "Everyone from crew is already on this board."
          ) : (
            "No matches. Try a different search."
          )}
        </div>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-1">
          {available.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(member);
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-sky-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                  {member.name.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{member.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {[member.defaultRole, member.email].filter(Boolean).join(" · ") || "No role listed"}
                  </p>
                </div>
                <UserPlus className="h-4 w-4 shrink-0 text-sky-600" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </ModalShell>
  );
}

export function PersonDetailModal({
  person,
  crewMember,
  group,
  onUpdate,
  onRemove,
  onPhoto,
  onClose,
}: {
  person: ProductionPerson;
  crewMember?: CrewMember;
  group: ProductionPersonGroup;
  onUpdate: (patch: Partial<ProductionPerson>) => void;
  onRemove: () => void;
  onPhoto: (file: File) => Promise<void>;
  onClose: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const title = person.name?.trim() || "Crew member";

  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <label className="relative block shrink-0 cursor-pointer">
            <PersonAvatar person={person} group={group} size="lg" />
            <span className="absolute inset-x-0 bottom-0 rounded-b-lg bg-slate-900/55 py-0.5 text-center text-[10px] font-medium text-white">
              {uploading ? "Uploading…" : "Add photo"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                setUploadError(null);
                try {
                  await onPhoto(file);
                } catch (err) {
                  const code =
                    err && typeof err === "object" && "code" in err
                      ? String((err as { code: string }).code)
                      : "";
                  setUploadError(
                    code === "storage/unauthorized"
                      ? "Photo upload was denied. Deploy the latest storage.rules to Firebase, then try again."
                      : err instanceof Error
                        ? err.message
                        : "Photo upload failed"
                  );
                } finally {
                  setUploading(false);
                  e.target.value = "";
                }
              }}
            />
          </label>
          <div className="min-w-0 flex-1 space-y-2">
            <Input
              label="Name"
              value={person.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
            />
            <Input
              label="Role on this project"
              value={person.role}
              onChange={(e) => onUpdate({ role: e.target.value })}
            />
          </div>
        </div>

        {uploadError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {uploadError}
          </p>
        ) : null}

        {crewMember && (
          <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5 text-xs text-sky-950">
            <p className="font-semibold">Linked to crew catalog</p>
            <p className="mt-1 text-sky-900/80">
              {crewMember.defaultRate
                ? `Default rate: $${crewMember.defaultRate}${crewMember.rateType ? ` (${crewMember.rateType})` : ""}`
                : "No default rate on file"}
            </p>
            {crewMember.notes && (
              <p className="mt-1 text-sky-900/70">{crewMember.notes}</p>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Call time"
            value={person.callTime ?? ""}
            onChange={(e) => onUpdate({ callTime: e.target.value })}
            placeholder="7:00 AM"
          />
          <Input
            label="Phone"
            value={person.phone ?? ""}
            onChange={(e) => onUpdate({ phone: e.target.value })}
          />
        </div>
        <Input
          label="Email"
          type="email"
          value={person.email ?? ""}
          onChange={(e) => onUpdate({ email: e.target.value })}
        />
        <Textarea
          label="Notes"
          value={person.notes ?? ""}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          rows={3}
          placeholder="Wardrobe, scenes, parking, etc."
        />

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <Button type="button" onClick={onClose}>
            Done
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="text-red-600 hover:text-red-700"
          >
            Remove from board
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
