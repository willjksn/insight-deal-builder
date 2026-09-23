"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { scriptWriterListSessions } from "@/lib/scriptWriter/apiClient";
import { createShootGuide, generateShootGuide, updateShootGuide } from "@/lib/shootGuide/apiClient";
import { uploadShootGuideReference } from "@/lib/shootGuide/storage";
import {
  VISUAL_PRIORITY_OPTIONS,
  creativeStyleSelectOptions,
  type CreativeStylePreset,
  type ShootGuideReference,
  type ShootGuideShotCountMode,
  type ShootGuideSourceType,
  type VisualPriority,
} from "@/lib/shootGuide/types";
import { canUseProductionTools } from "@/lib/utils/permissions";
import { cn } from "@/lib/utils/cn";
import { useEnsureWorkspace } from "./useEnsureWorkspace";

type ScriptOption = {
  id: string;
  title: string;
  scenes: { sceneNumber: string; heading: string; action: string }[];
};

type PendingFiles = Partial<Record<"location" | "mood" | "subject" | "product", File[]>>;

const SOURCE_OPTIONS: { value: ShootGuideSourceType; label: string; hint: string }[] = [
  { value: "quick_scene", label: "Quick Scene", hint: "Describe the scene in plain language." },
  { value: "script", label: "Existing Script / Scene", hint: "Pull a script already in ShootSpine." },
  { value: "blank", label: "Blank", hint: "Manual setup — no prompt required." },
];

const SHOT_COUNT_OPTIONS: { value: ShootGuideShotCountMode; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "3", label: "3" },
  { value: "5", label: "5" },
  { value: "8", label: "8" },
  { value: "custom", label: "Custom" },
];

export function NewShootGuideForm() {
  useEnsureWorkspace("shoot-guide");
  const router = useRouter();
  const { user, appUser, loading: authLoading } = useAuth();
  const [sourceType, setSourceType] = useState<ShootGuideSourceType>("quick_scene");
  const [prompt, setPrompt] = useState("");
  const [stylePreset, setStylePreset] = useState<CreativeStylePreset>("cinematic");
  const [customStyle, setCustomStyle] = useState("");
  const [priorities, setPriorities] = useState<VisualPriority[]>(["emotion", "movement"]);
  const [shotCountMode, setShotCountMode] = useState<ShootGuideShotCountMode>("auto");
  const [customCount, setCustomCount] = useState("5");
  const [useMyEquipment, setUseMyEquipment] = useState(true);
  const [showIdeal, setShowIdeal] = useState(true);
  const [scriptId, setScriptId] = useState("");
  const [sceneId, setSceneId] = useState("");
  const [scripts, setScripts] = useState<ScriptOption[]>([]);
  const [scriptsError, setScriptsError] = useState<string | null>(null);
  const [files, setFiles] = useState<PendingFiles>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(() => {
    if (!user) return Promise.resolve(null);
    return user.getIdToken();
  }, [user]);

  useEffect(() => {
    if (!user || sourceType !== "script") return;
    let cancelled = false;
    void scriptWriterListSessions(getToken)
      .then(({ sessions }) => {
        if (cancelled) return;
        const options: ScriptOption[] = (sessions as Array<Record<string, unknown>>).map((s) => {
          const script = (s.script ?? null) as {
            title?: string;
            scenes?: { sceneNumber?: string; heading?: string; action?: string }[];
          } | null;
          return {
            id: String(s.id),
            title: String(s.title || script?.title || "Untitled script"),
            scenes: (script?.scenes ?? []).map((sc, i) => ({
              sceneNumber: String(sc.sceneNumber || i + 1),
              heading: String(sc.heading || `Scene ${i + 1}`),
              action: String(sc.action || ""),
            })),
          };
        });
        setScripts(options);
        setScriptsError(null);
      })
      .catch((e) => {
        if (!cancelled) {
          setScriptsError(e instanceof Error ? e.message : "Could not load scripts");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, sourceType, getToken]);

  const selectedScript = useMemo(
    () => scripts.find((s) => s.id === scriptId) ?? null,
    [scripts, scriptId]
  );
  const selectedScene = useMemo(
    () => selectedScript?.scenes.find((sc) => sc.sceneNumber === sceneId) ?? null,
    [selectedScript, sceneId]
  );

  function togglePriority(value: VisualPriority) {
    setPriorities((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
  }

  function onFiles(kind: keyof PendingFiles, list: FileList | null) {
    setFiles((prev) => ({ ...prev, [kind]: list ? Array.from(list) : [] }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const sceneLabel = selectedScene
        ? `${selectedScene.sceneNumber}. ${selectedScene.heading}`
        : null;
      let nextPrompt = prompt.trim();
      if (sourceType === "script" && !nextPrompt && selectedScene) {
        nextPrompt = [selectedScene.heading, selectedScene.action].filter(Boolean).join("\n\n");
      } else if (sourceType === "script" && !nextPrompt && selectedScript) {
        nextPrompt = selectedScript.title;
      }

      const { guide } = await createShootGuide(getToken, {
        sourceType,
        prompt: nextPrompt,
        sourceScriptId: sourceType === "script" ? scriptId : null,
        sourceSceneId: sourceType === "script" && sceneId ? sceneId : null,
        sourceSceneLabel: sourceType === "script" ? sceneLabel : null,
        creativeStylePreset: stylePreset,
        creativeIntent: stylePreset === "custom" ? customStyle : stylePreset,
        visualPriorities: priorities,
        shotCountMode,
        desiredShotCount: Number(customCount) || 5,
        useMyEquipment,
        showIdealWhenNotOwned: useMyEquipment ? showIdeal : false,
      });

      const uploads: ShootGuideReference[] = [...(guide.references ?? [])];
      const kinds = ["location", "mood", "subject", "product"] as const;
      for (const kind of kinds) {
        for (const file of files[kind] ?? []) {
          const uploaded = await uploadShootGuideReference(
            user.uid,
            guide.id,
            kind,
            crypto.randomUUID(),
            file
          );
          uploads.push({
            id: crypto.randomUUID(),
            kind,
            storageUrl: uploaded.storageUrl,
            storagePath: uploaded.storagePath,
            fileName: uploaded.fileName,
          });
        }
      }
      if (uploads.length) {
        await updateShootGuide(getToken, guide.id, { references: uploads });
      }

      try {
        await generateShootGuide(getToken, guide.id);
        router.push(`/shoot-guide/${guide.id}`);
      } catch (genErr) {
        const msg = encodeURIComponent(
          genErr instanceof Error ? genErr.message : "Generation failed"
        );
        router.push(`/shoot-guide/${guide.id}?generateError=${msg}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create shoot guide");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !appUser) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Sign in to use Shoot Guide.</p>
      </div>
    );
  }

  if (!canUseProductionTools(appUser)) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">You do not have access to production tools.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <PageHeader
        title="New Shoot Guide"
        subtitle="Start from a Quick Scene, an existing script, or a blank guide. Generate writes a DP shot plan you can reopen and edit."
      />

      <form onSubmit={onSubmit} className="space-y-5">
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <Card>
          <CardBody className="space-y-4">
            <p className="text-sm font-semibold text-slate-900">Source</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {SOURCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSourceType(opt.value)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left min-h-[72px]",
                    sourceType === opt.value
                      ? "border-sky-400 bg-sky-50 ring-1 ring-sky-200"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <span className="block text-sm font-semibold text-slate-900">{opt.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{opt.hint}</span>
                </button>
              ))}
            </div>

            {sourceType === "script" ? (
              <div className="space-y-3">
                {scriptsError ? (
                  <p className="text-sm text-amber-800">{scriptsError}</p>
                ) : null}
                <Select
                  label="Script"
                  value={scriptId}
                  onChange={(e) => {
                    setScriptId(e.target.value);
                    setSceneId("");
                  }}
                  options={[
                    { value: "", label: scripts.length ? "Select a script" : "Loading scripts…" },
                    ...scripts.map((s) => ({ value: s.id, label: s.title })),
                  ]}
                  touch
                />
                {selectedScript && selectedScript.scenes.length > 0 ? (
                  <Select
                    label="Scene (optional)"
                    value={sceneId}
                    onChange={(e) => setSceneId(e.target.value)}
                    options={[
                      { value: "", label: "Whole script" },
                      ...selectedScript.scenes.map((sc) => ({
                        value: sc.sceneNumber,
                        label: `${sc.sceneNumber}. ${sc.heading}`,
                      })),
                    ]}
                    touch
                  />
                ) : null}
              </div>
            ) : null}

            <Textarea
              label="Scene idea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                sourceType === "blank"
                  ? "Optional notes for this guide"
                  : "Stormi is on the treadmill working out. I want a cinematic workout sequence that shows effort and confidence."
              }
              required={sourceType === "quick_scene"}
              touch
              rows={5}
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <Select
              label="Creative style / mood"
              value={stylePreset}
              onChange={(e) => setStylePreset(e.target.value as CreativeStylePreset)}
              options={creativeStyleSelectOptions()}
              touch
            />
            {stylePreset === "custom" ? (
              <Input
                label="Custom style"
                value={customStyle}
                onChange={(e) => setCustomStyle(e.target.value)}
                placeholder="e.g. polished / energetic / intimate"
                touch
              />
            ) : null}

            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">Visual priorities</p>
              <div className="flex flex-wrap gap-2">
                {VISUAL_PRIORITY_OPTIONS.map((opt) => {
                  const on = priorities.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => togglePriority(opt)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-sm font-medium capitalize min-h-[40px]",
                        on
                          ? "bg-sky-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Desired shot count"
                value={shotCountMode}
                onChange={(e) => setShotCountMode(e.target.value as ShootGuideShotCountMode)}
                options={SHOT_COUNT_OPTIONS}
                touch
              />
              {shotCountMode === "custom" ? (
                <Input
                  label="Custom count"
                  type="number"
                  min={1}
                  max={40}
                  value={customCount}
                  onChange={(e) => setCustomCount(e.target.value)}
                  touch
                />
              ) : null}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <p className="text-sm font-semibold text-slate-900">References</p>
            <p className="text-xs text-slate-500">
              Optional stills. Location photos inform what is possible; mood images inform the look. Analysis comes in a later sprint.
            </p>
            <Input label="Location image(s)" type="file" accept="image/*" multiple onChange={(e) => onFiles("location", e.target.files)} />
            <Input label="Mood / look reference(s)" type="file" accept="image/*" multiple onChange={(e) => onFiles("mood", e.target.files)} />
            <Input label="Subject reference (optional)" type="file" accept="image/*" multiple onChange={(e) => onFiles("subject", e.target.files)} />
            <Input label="Product reference (optional)" type="file" accept="image/*" multiple onChange={(e) => onFiles("product", e.target.files)} />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <label className="flex items-start gap-3 text-sm text-slate-800">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
                checked={useMyEquipment}
                onChange={(e) => setUseMyEquipment(e.target.checked)}
              />
              <span>
                <span className="font-semibold">Use My Equipment</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Prefer items from your Equipment Catalog when shots are generated.
                </span>
              </span>
            </label>
            {useMyEquipment ? (
              <label className="flex items-start gap-3 pl-7 text-sm text-slate-800">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                  checked={showIdeal}
                  onChange={(e) => setShowIdeal(e.target.checked)}
                />
                <span>
                  <span className="font-semibold">Show ideal equipment when mine is not ideal</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Keep the owned match, plus the adjustment needed.
                  </span>
                </span>
              </label>
            ) : null}
          </CardBody>
        </Card>

        <Button type="submit" size="touch" className="w-full sm:w-auto" disabled={saving}>
          {saving ? "Generating…" : "Generate Shoot Guide"}
        </Button>
      </form>
    </div>
  );
}
