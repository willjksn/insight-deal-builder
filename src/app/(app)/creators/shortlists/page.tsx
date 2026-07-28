"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/contexts/AuthContext";
import { canManageCreators } from "@/lib/utils/permissions";
import {
  createShortlist,
  deleteShortlist,
  getShortlist,
  listShortlists,
  matchCreators,
  patchShortlist,
} from "@/lib/creators/apiClient";
import type { CreatorMatchResult, CreatorShortlist } from "@/lib/creators/opsTypes";

export default function CreatorShortlistsPage() {
  const { user, appUser } = useAuth();
  const canManage = canManageCreators(appUser);
  const [shortlists, setShortlists] = useState<CreatorShortlist[]>([]);
  const [active, setActive] = useState<CreatorShortlist | null>(null);
  const [matches, setMatches] = useState<CreatorMatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(() => {
    if (!user) throw new Error("Not signed in");
    return user.getIdToken();
  }, [user]);

  const reload = useCallback(async () => {
    if (!user) return;
    const res = await listShortlists(getToken);
    setShortlists(res.shortlists);
  }, [user, getToken]);

  useEffect(() => {
    if (!user || !canManage) return;
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [user, canManage, reload]);

  const openShortlist = async (id: string) => {
    const res = await getShortlist(getToken, id);
    setActive(res.shortlist);
    setMatches([]);
  };

  if (!canManage) return <div className="p-6 text-sm">Not authorized.</div>;

  return (
    <div>
      <PageHeader
        title="Creator shortlists"
        subtitle="Match roster creators to briefs, request availability, and place holds"
        action={
          <Link href="/creators/network">
            <Button size="touch" variant="outline">
              Network
            </Button>
          </Link>
        }
      />
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Shortlists</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} touch />
            <Input
              label="Required niche"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              touch
            />
            <Input
              label="Location preference"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              touch
            />
            <Textarea label="Brief" value={brief} onChange={(e) => setBrief(e.target.value)} touch />
            <Button
              size="touch"
              disabled={busy || !name.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await createShortlist(getToken, {
                    name: name.trim(),
                    requiredNiche: niche.trim() || undefined,
                    locationPreference: location.trim() || undefined,
                    brief: brief.trim() || undefined,
                  });
                  setName("");
                  setNiche("");
                  setLocation("");
                  setBrief("");
                  await reload();
                  setActive(res.shortlist);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Create shortlist
            </Button>
            {loading ? (
              <LoadingSpinner />
            ) : shortlists.length === 0 ? (
              <p className="text-sm text-slate-500">No shortlists yet.</p>
            ) : (
              <ul className="space-y-1">
                {shortlists.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                        active?.id === s.id ? "bg-sky-50 font-semibold" : "hover:bg-slate-50"
                      }`}
                      onClick={() => openShortlist(s.id)}
                    >
                      {s.name}
                      <span className="ml-2 text-xs text-slate-500">
                        ({s.entries.length})
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          {!active ? (
            <EmptyState title="Select a shortlist" description="Or create one to start matching." />
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">{active.name}</h2>
                    {active.requiredNiche && (
                      <p className="text-sm text-slate-500">Niche: {active.requiredNiche}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const res = await matchCreators(getToken, {
                            requiredNiche: active.requiredNiche,
                            locationPreference: active.locationPreference,
                            audienceNotes: active.brief,
                            useAgent: true,
                          });
                          setMatches(res.matches);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Run match agent
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const res = await patchShortlist(getToken, active.id, {
                            action: "populate",
                          });
                          setActive(res.shortlist);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Auto-populate
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm("Delete shortlist?")) return;
                        await deleteShortlist(getToken, active.id);
                        setActive(null);
                        await reload();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </CardHeader>
                <CardBody className="space-y-2">
                  {active.entries.length === 0 ? (
                    <p className="text-sm text-slate-500">No creators on this shortlist yet.</p>
                  ) : (
                    active.entries.map((e) => (
                      <div
                        key={e.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2"
                      >
                        <div>
                          <Link
                            href={`/creators/${e.creatorId}`}
                            className="font-semibold text-sky-800"
                          >
                            {e.creatorName}
                          </Link>
                          <div className="flex flex-wrap gap-1 text-xs text-slate-500">
                            <Badge>{e.status}</Badge>
                            {e.matchScore != null && <span>Score {e.matchScore}</span>}
                            {e.holdUntil && <span>Hold until {e.holdUntil}</span>}
                          </div>
                          {e.matchReasons?.length ? (
                            <p className="mt-1 text-xs text-slate-500">
                              {e.matchReasons.join(" · ")}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const until = new Date();
                              until.setDate(until.getDate() + 7);
                              const res = await patchShortlist(getToken, active.id, {
                                action: "updateEntry",
                                entryId: e.id,
                                entryPatch: {
                                  status: "hold",
                                  holdUntil: until.toISOString().slice(0, 10),
                                },
                              });
                              setActive(res.shortlist);
                            }}
                          >
                            Hold 7d
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const res = await patchShortlist(getToken, active.id, {
                                action: "updateEntry",
                                entryId: e.id,
                                entryPatch: { status: "availability_requested" },
                              });
                              setActive(res.shortlist);
                            }}
                          >
                            Request avail.
                          </Button>
                          <Button
                            size="sm"
                            onClick={async () => {
                              const res = await patchShortlist(getToken, active.id, {
                                action: "updateEntry",
                                entryId: e.id,
                                entryPatch: { status: "confirmed" },
                              });
                              setActive(res.shortlist);
                            }}
                          >
                            Confirm
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardBody>
              </Card>

              {matches.length > 0 && (
                <Card>
                  <CardHeader>
                    <h2 className="font-semibold">Match agent results</h2>
                  </CardHeader>
                  <CardBody className="space-y-2">
                    {matches.map((m) => (
                      <div
                        key={m.creatorId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2"
                      >
                        <div>
                          <div className="font-semibold">
                            {m.creatorName}{" "}
                            <span className="text-sm text-slate-500">({m.score})</span>
                          </div>
                          <p className="text-xs text-slate-500">{m.reasons.join(" · ")}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={async () => {
                            const res = await patchShortlist(getToken, active.id, {
                              action: "addEntry",
                              entry: {
                                creatorId: m.creatorId,
                                creatorName: m.creatorName,
                                matchScore: m.score,
                                matchReasons: m.reasons,
                                status: "suggested",
                              },
                            });
                            setActive(res.shortlist);
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                  </CardBody>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
