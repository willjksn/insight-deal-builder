"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  liveGetDiscoveryProfile,
  liveImportDiscoveryCandidates,
  liveListDiscoveryRuns,
  liveRunDiscovery,
  liveSaveDiscoveryProfile,
} from "@/lib/liveProduction/apiClient";
import type { LiveDiscoveryProfileDoc, LiveDiscoveryRun } from "@/lib/liveProduction/discoveryTypes";
import { DEFAULT_LIVE_PRODUCTION_SERVICES } from "@/lib/liveProduction/defaultsKeywords";
import { LIVE_DISCOVERY_SOURCE_LANES } from "@/lib/liveProduction/buildDiscoveryQueries";
import { formatValueRange } from "@/lib/liveProduction/format";
import { Search } from "lucide-react";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

function linesToList(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function LiveProductionDiscoveryPage() {
  const { user, appUser } = useAuth();
  const canManage = canManageRevenueOpportunities(appUser);
  const [profile, setProfile] = useState<LiveDiscoveryProfileDoc | null>(null);
  const [mode, setMode] = useState<"live" | "demo">("demo");
  const [runs, setRuns] = useState<LiveDiscoveryRun[]>([]);
  const [activeRun, setActiveRun] = useState<LiveDiscoveryRun | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [homeLocation, setHomeLocation] = useState("Charlotte, NC");
  const [radiusMiles, setRadiusMiles] = useState("250");
  const [minimumProject, setMinimumProject] = useState("5000");
  const [preferredProject, setPreferredProject] = useState("15000");
  const [keywordsText, setKeywordsText] = useState("");
  const [excludeText, setExcludeText] = useState("");
  const [services, setServices] = useState<string[]>([]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = () => user.getIdToken();
      const [prof, list] = await Promise.all([
        liveGetDiscoveryProfile(token),
        liveListDiscoveryRuns(token),
      ]);
      setProfile(prof.profile);
      setMode(prof.discoveryMode);
      setHomeLocation(prof.profile.homeLocation);
      setRadiusMiles(String(prof.profile.radiusMiles));
      setMinimumProject(String(prof.profile.minimumProject));
      setPreferredProject(String(prof.profile.preferredProject));
      setKeywordsText(prof.profile.keywords.join("\n"));
      setExcludeText(prof.profile.exclude.join("\n"));
      setServices(prof.profile.services);
      setRuns(list.runs);
      if (list.runs[0]) setActiveRun(list.runs[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load discovery");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  const streamingOn = useMemo(
    () => services.some((s) => /stream/i.test(s)),
    [services]
  );

  const toggleService = (name: string) => {
    setServices((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const persistProfile = async () => {
    if (!user || !canManage) return;
    const { profile: next } = await liveSaveDiscoveryProfile(() => user.getIdToken(), {
      homeLocation,
      radiusMiles: Number(radiusMiles) || 250,
      minimumProject: Number(minimumProject) || 0,
      preferredProject: Number(preferredProject) || 0,
      keywords: linesToList(keywordsText),
      exclude: linesToList(excludeText),
      services,
    });
    setProfile(next);
    return next;
  };

  const saveProfile = async () => {
    if (!user || !canManage) return;
    setBusy(true);
    setError(null);
    setSavedMsg(null);
    try {
      await persistProfile();
      setSavedMsg("Target profile saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const runDiscovery = async () => {
    if (!user || !canManage) return;
    setBusy(true);
    setError(null);
    setSavedMsg(null);
    setSelected(new Set());
    try {
      await persistProfile();
      const { run } = await liveRunDiscovery(() => user.getIdToken());
      setActiveRun(run);
      setRuns((prev) => [run, ...prev.filter((r) => r.id !== run.id)]);
      setSelected(
        new Set(
          run.candidates
            .filter((c) => c.priority === "high" || c.includesLiveStreaming)
            .map((c) => c.id)
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discovery failed");
    } finally {
      setBusy(false);
    }
  };

  const importSelected = async () => {
    if (!user || !canManage || !activeRun) return;
    if (!selected.size) {
      setError("Select at least one candidate to import.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { opportunities, run } = await liveImportDiscoveryCandidates(
        () => user.getIdToken(),
        activeRun.id,
        [...selected]
      );
      setActiveRun(run);
      setRuns((prev) => prev.map((r) => (r.id === run.id ? run : r)));
      setSavedMsg(
        opportunities.length
          ? `Imported ${opportunities.length} opportunity${opportunities.length === 1 ? "" : "ies"} into the inbox.`
          : "No new opportunities imported (possible duplicates)."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <PageHeader
        title="Search live production opportunities"
        subtitle="On-demand only — search when you need it. Covers cities, counties, state portals, universities, venues, churches, corporate/private, festivals, partner overflow, live streaming, and SAM.gov."
        action={
          canManage ? (
            <Button size="touch" onClick={runDiscovery} disabled={busy}>
              <Search className="mr-2 h-4 w-4" />
              {busy ? "Searching…" : "Search now"}
            </Button>
          ) : undefined
        }
      />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {savedMsg && <p className="mb-4 text-sm text-emerald-700">{savedMsg}</p>}

      <Card className="mb-6">
        <CardBody className="space-y-3 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-slate-900">
                On-demand wide search · mode: {mode === "live" ? "Live web search" : "Demo candidates"}
              </p>
              <p className="text-slate-600">
                No nightly auto-run. Click <strong>Search now</strong> when you want fresh results.
                {mode === "live"
                  ? " Live mode uses Tavily across many public and private-facing sources."
                  : " Configure TAVILY_API_KEY and turn off SCOUT_USE_MOCK_AI for live search."}
              </p>
            </div>
            <Link href="/live-production" className="font-medium text-sky-800 underline">
              Back to inbox
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {LIVE_DISCOVERY_SOURCE_LANES.map((lane) => (
              <span
                key={lane}
                className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
              >
                {lane}
              </span>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="font-medium text-slate-900">Target profile</p>
            <p className="text-sm text-slate-600">
              What IMG / your company wants ShootSpine to prioritize.
            </p>
          </CardHeader>
          <CardBody className="space-y-3">
            <Input
              label="Home location"
              value={homeLocation}
              onChange={(e) => setHomeLocation(e.target.value)}
              touch
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                label="Radius (mi)"
                value={radiusMiles}
                onChange={(e) => setRadiusMiles(e.target.value)}
                touch
              />
              <Input
                label="Min $"
                value={minimumProject}
                onChange={(e) => setMinimumProject(e.target.value)}
                touch
              />
              <Input
                label="Preferred $"
                value={preferredProject}
                onChange={(e) => setPreferredProject(e.target.value)}
                touch
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Services</p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_LIVE_PRODUCTION_SERVICES.map((s) => {
                  const on = services.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleService(s)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                        on
                          ? "bg-slate-900 text-white ring-slate-900"
                          : "bg-white text-slate-600 ring-slate-200"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              {streamingOn && (
                <p className="mt-2 text-xs text-emerald-800">
                  Live Streaming is on — discovery will prioritize webcast / livestream RFPs.
                </p>
              )}
            </div>
            <Textarea
              label="Keywords (one per line)"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              rows={8}
            />
            <Textarea
              label="Exclude"
              value={excludeText}
              onChange={(e) => setExcludeText(e.target.value)}
              rows={3}
            />
            {canManage && (
              <Button size="touch" variant="outline" onClick={saveProfile} disabled={busy}>
                Save profile
              </Button>
            )}
            {profile && (
              <p className="text-xs text-slate-500">
                Last saved: {profile.updatedAt && profile.updatedAt !== new Date(0).toISOString()
                  ? new Date(profile.updatedAt).toLocaleString()
                  : "defaults (not saved yet)"}
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="font-medium text-slate-900">Latest discovery run</p>
            {activeRun && (
              <p className="text-sm text-slate-600">
                {activeRun.status} · {activeRun.candidates.length} candidates
                {activeRun.usedLiveSearch ? " · live search" : " · demo"}
                {activeRun.candidates.some((c) => c.includesLiveStreaming)
                  ? ` · ${activeRun.candidates.filter((c) => c.includesLiveStreaming).length} with live streaming`
                  : ""}
              </p>
            )}
          </CardHeader>
          <CardBody className="space-y-3">
            {!activeRun && (
              <p className="text-sm text-slate-600">
                Save your profile, then click <strong>Search now</strong>. Results appear here —
                import the ones worth pursuing into the inbox. Nothing runs overnight.
              </p>
            )}
            {activeRun?.error && (
              <p className="text-sm text-red-600">{activeRun.error}</p>
            )}
            {activeRun?.queries?.length ? (
              <details className="text-xs text-slate-600">
                <summary className="cursor-pointer font-medium">Search queries</summary>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {activeRun.queries.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </details>
            ) : null}

            {activeRun?.candidates.map((c) => {
              const checked = selected.has(c.id);
              return (
                <label
                  key={c.id}
                  className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    onChange={() => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(c.id)) next.delete(c.id);
                        else next.add(c.id);
                        return next;
                      });
                    }}
                  />
                  <div className="min-w-0 flex-1 space-y-1 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{c.title}</span>
                      <Badge
                        variant={
                          c.priority === "high"
                            ? "success"
                            : c.priority === "good"
                              ? "info"
                              : "default"
                        }
                      >
                        {c.priority}
                      </Badge>
                      {c.includesLiveStreaming && (
                        <Badge variant="warning">Live streaming</Badge>
                      )}
                    </div>
                    <p className="text-slate-600">
                      {c.organizationName}
                      {c.location ? ` · ${c.location}` : ""}
                      {" · "}
                      {formatValueRange(c.estimatedValueLow, c.estimatedValueHigh)}
                    </p>
                    {c.whyFit && <p className="text-slate-700">{c.whyFit}</p>}
                    {c.servicesMentioned.length > 0 && (
                      <p className="text-xs text-slate-500">
                        {c.servicesMentioned.join(" · ")}
                      </p>
                    )}
                    {c.sourceUrl && (
                      <a
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-sky-800 underline break-all"
                      >
                        {c.sourceUrl}
                      </a>
                    )}
                  </div>
                </label>
              );
            })}

            {canManage && activeRun && activeRun.candidates.length > 0 && (
              <Button size="touch" onClick={importSelected} disabled={busy}>
                Import selected to inbox
              </Button>
            )}
          </CardBody>
        </Card>
      </div>

      {runs.length > 1 && (
        <Card className="mt-6">
          <CardHeader>
            <p className="font-medium text-slate-900">Recent runs</p>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            {runs.map((r) => (
              <button
                key={r.id}
                type="button"
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-slate-50"
                onClick={() => {
                  setActiveRun(r);
                  setSelected(new Set());
                }}
              >
                <span>
                  {new Date(r.createdAt).toLocaleString()} · {r.candidates.length} candidates
                </span>
                <Badge>{r.status}</Badge>
              </button>
            ))}
          </CardBody>
        </Card>
      )}
    </>
  );
}
