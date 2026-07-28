"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Plus, ScrollText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  scriptWriterDeleteSeries,
  scriptWriterGetSeries,
  scriptWriterUpdateSeries,
} from "@/lib/scriptWriter/apiClient";
import {
  ScriptSeries,
  ScriptSeriesCharacter,
  ScriptSeriesEntry,
  ScriptSeriesEntryKind,
  SCRIPT_SERIES_ENTRY_KIND_LABELS,
} from "@/lib/scriptWriter/series/types";
import { canManageUsers } from "@/lib/utils/permissions";

type CharacterDraft = ScriptSeriesCharacter;

export default function SeriesDetailPage() {
  const params = useParams<{ id: string }>();
  const seriesId = params.id;
  const router = useRouter();
  const { user, appUser } = useAuth();
  const isAdmin = canManageUsers(appUser);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<ScriptSeriesEntry[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editable bible fields.
  const [title, setTitle] = useState("");
  const [premise, setPremise] = useState("");
  const [theme, setTheme] = useState("");
  const [world, setWorld] = useState("");
  const [tone, setTone] = useState("");
  const [genre, setGenre] = useState("");
  const [lookAndFeel, setLookAndFeel] = useState("");
  const [motifsText, setMotifsText] = useState("");
  const [characters, setCharacters] = useState<CharacterDraft[]>([]);
  const [spicyMode, setSpicyMode] = useState(false);

  const hydrate = useCallback((series: ScriptSeries) => {
    setTitle(series.title ?? "");
    setPremise(series.premise ?? "");
    setTheme(series.theme ?? "");
    setWorld(series.world ?? "");
    setTone(series.tone ?? "");
    setGenre(series.genre ?? "");
    setLookAndFeel(series.lookAndFeel ?? "");
    setMotifsText((series.motifs ?? []).join("\n"));
    setCharacters(series.recurringCharacters ?? []);
    setSpicyMode(Boolean(series.spicyMode));
  }, []);

  useEffect(() => {
    if (!user || !seriesId) return;
    setLoading(true);
    scriptWriterGetSeries(() => user.getIdToken(), seriesId)
      .then((res) => {
        hydrate(res.series);
        setEntries(res.entries);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load series"))
      .finally(() => setLoading(false));
  }, [user, seriesId, hydrate]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const res = await scriptWriterUpdateSeries(() => user.getIdToken(), seriesId, {
        title: title.trim() || "Untitled series",
        premise,
        theme,
        world,
        tone,
        genre,
        lookAndFeel,
        motifs: motifsText
          .split("\n")
          .map((m) => m.trim())
          .filter(Boolean),
        recurringCharacters: characters,
        spicyMode: isAdmin ? spicyMode : undefined,
      });
      hydrate(res.series);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await scriptWriterDeleteSeries(() => user.getIdToken(), seriesId);
      router.push("/script-writer/series");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  };

  const addCharacter = () =>
    setCharacters((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", role: "", description: "" },
    ]);
  const patchCharacter = (id: string, partial: Partial<CharacterDraft>) =>
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, ...partial } : c)));
  const removeCharacter = (id: string) =>
    setCharacters((prev) => prev.filter((c) => c.id !== id));

  const newEntryHref = (kind: ScriptSeriesEntryKind) =>
    `/script-writer?seriesId=${encodeURIComponent(seriesId)}&entryKind=${kind}`;

  if (loading) return <LoadingSpinner className="py-20" />;

  return (
    <div className="pb-24">
      <Link
        href="/script-writer/series"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> All series
      </Link>

      <PageHeader
        title={title || "Series"}
        subtitle="Shared canon for every episode, teaser, and trailer. Edit the bible once — new entries inherit the world, cast, and motifs, and generation carries the story forward."
      />

      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-start">
        {/* Bible editor */}
        <Card>
          <CardBody className="space-y-4">
            <Input
              label="Series title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="The Gaze"
            />
            <Textarea
              label="Premise"
              value={premise}
              onChange={(e) => setPremise(e.target.value)}
              placeholder="A creator can never shake the feeling that someone is always watching her."
              rows={3}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Textarea
                label="Recurring theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Being watched; the loss of private self"
                rows={2}
              />
              <Textarea
                label="World / setting"
                value={world}
                onChange={(e) => setWorld(e.target.value)}
                placeholder="Present-day, a creator's apartment-studio and the city outside"
                rows={2}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="Paranoid, intimate, slow-burn"
              />
              <Input
                label="Genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Psychological thriller"
              />
            </div>
            <Textarea
              label="Signature look & feel"
              value={lookAndFeel}
              onChange={(e) => setLookAndFeel(e.target.value)}
              placeholder="Cool low-key light, long lenses, reflections and screens, shallow focus"
              rows={2}
            />
            <div>
              <Textarea
                label="Signature motifs (one per line)"
                value={motifsText}
                onChange={(e) => setMotifsText(e.target.value)}
                placeholder={"POV watcher shot from just off-frame\nReflections in screens and glass\nOver-the-shoulder framing implying presence"}
                rows={4}
              />
              <p className="mt-1 text-xs text-slate-500">
                Recurring visual/thematic beats the AI must weave into every entry.
              </p>
            </div>

            {/* Recurring characters */}
            <div className="border-t border-slate-100 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Recurring characters
                </p>
                <Button type="button" size="sm" variant="ghost" onClick={addCharacter}>
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
              {characters.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Add the cast that recurs across entries so names and traits stay consistent.
                </p>
              ) : (
                <div className="space-y-3">
                  {characters.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                    >
                      <div className="flex gap-2">
                        <Input
                          value={c.name}
                          onChange={(e) => patchCharacter(c.id, { name: e.target.value })}
                          placeholder="Name"
                        />
                        <Input
                          value={c.role ?? ""}
                          onChange={(e) => patchCharacter(c.id, { role: e.target.value })}
                          placeholder="Role (e.g. the creator)"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label="Remove character"
                          onClick={() => removeCharacter(c.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <Textarea
                        className="mt-2"
                        value={c.description ?? ""}
                        onChange={(e) =>
                          patchCharacter(c.id, { description: e.target.value })
                        }
                        placeholder="Look, personality, what drives them"
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isAdmin ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-rose-200/80 bg-rose-50/60 px-4 py-3">
                <input
                  type="checkbox"
                  checked={spicyMode}
                  onChange={(e) => setSpicyMode(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-400"
                />
                <span className="text-sm text-slate-700">
                  <span className="font-medium text-rose-900">Spicy tone</span>
                  <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                    Admin
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Carried through to every new entry in this series. Adults only (18+),
                    non-explicit.
                  </span>
                </span>
              </label>
            ) : null}

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteOpen(true)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="mr-1 h-4 w-4" /> Delete series
              </Button>
              <Button type="button" onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save bible
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Entries */}
        <div className="space-y-4">
          <Card>
            <CardBody className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Add entry
              </p>
              <p className="text-sm text-slate-600">
                Start a new script that inherits this series&apos; canon.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(SCRIPT_SERIES_ENTRY_KIND_LABELS) as ScriptSeriesEntryKind[]).map(
                  (kind) => (
                    <Link key={kind} href={newEntryHref(kind)}>
                      <Button type="button" variant="secondary" size="sm" className="w-full">
                        <Plus className="mr-1 h-4 w-4" />
                        {SCRIPT_SERIES_ENTRY_KIND_LABELS[kind]}
                      </Button>
                    </Link>
                  )
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Entries ({entries.length})
              </p>
              {entries.length === 0 ? (
                <p className="text-sm text-slate-500">No entries yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {entries.map((e) => (
                    <li key={e.sessionId}>
                      <Link
                        href={`/script-writer/${e.sessionId}`}
                        className="flex items-center gap-3 py-2.5 hover:bg-slate-50"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                          <ScrollText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {SCRIPT_SERIES_ENTRY_KIND_LABELS[e.entryKind]} {e.order} · {e.title}
                          </p>
                          {e.recap ? (
                            <p className="truncate text-xs text-slate-500">{e.recap}</p>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this series?"
        description="The series bible will be removed. Existing scripts are kept but detached from the series."
        confirmLabel="Delete series"
        cancelLabel="Keep series"
        loading={deleting}
        onCancel={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
