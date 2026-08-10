"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clapperboard, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { useServicePackages } from "@/hooks/useServicePackages";
import {
  createContentPlanPitchSession,
  developPitchIdea,
  generateMorePitchIdeas,
  getContentPlanPitchSession,
} from "@/lib/contentPlan/pitchApiClient";
import type { ContentPlanPitchSession } from "@/lib/contentPlan/pitchTypes";
import {
  remainingPitchTargets,
  totalTargetCount,
} from "@/lib/contentPlan/pitchTargets";

function textInputClassName() {
  return "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-sky-200 focus:ring-2";
}

export function ContentPlanPitchClient({
  initialSessionId,
}: {
  initialSessionId?: string | null;
}) {
  const router = useRouter();
  const { user, appUser, loading: authLoading } = useAuth();
  const { data: packages, loading: packagesLoading } = useServicePackages();

  const [packageId, setPackageId] = useState("");
  const [clientName, setClientName] = useState("");
  const [businessContext, setBusinessContext] = useState("");
  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [session, setSession] = useState<ContentPlanPitchSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [developingId, setDevelopingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(Boolean(initialSessionId));

  const getToken = useCallback(() => {
    if (!user) return Promise.resolve(null);
    return user.getIdToken();
  }, [user]);

  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === packageId) || null,
    [packages, packageId]
  );

  useEffect(() => {
    if (!user || !initialSessionId) {
      setLoadingSession(false);
      return;
    }
    let cancelled = false;
    setLoadingSession(true);
    void getContentPlanPitchSession(getToken, initialSessionId)
      .then(({ session: next }) => {
        if (!cancelled) {
          setSession(next);
          setClientName(next.clientName || "");
          setBusinessContext(next.businessContext || "");
          setBrand(next.brand || "");
          setProduct(next.product || "");
          if (next.packageId) setPackageId(next.packageId);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load pitch session");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, initialSessionId, getToken]);

  const remaining = session
    ? totalTargetCount(remainingPitchTargets(session.deliverables, session.ideas))
    : 0;

  async function onGenerate() {
    if (!selectedPackage) {
      setError("Choose a service package.");
      return;
    }
    if (!businessContext.trim()) {
      setError("Describe the client’s business.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { session: next } = await createContentPlanPitchSession(getToken, {
        packageId: selectedPackage.id.startsWith("preset-")
          ? null
          : selectedPackage.id,
        packageName: selectedPackage.name,
        deliverables: selectedPackage.deliverables,
        clientName: clientName.trim() || selectedPackage.name,
        businessContext: businessContext.trim(),
        brand: brand.trim() || undefined,
        product: product.trim() || undefined,
      });
      setSession(next);
      router.replace(`/content-plans/pitch/${next.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate pitch ideas");
    } finally {
      setBusy(false);
    }
  }

  async function onGenerateMore() {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const { session: next } = await generateMorePitchIdeas(getToken, session.id);
      setSession(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate more ideas");
    } finally {
      setBusy(false);
    }
  }

  async function onDevelop(ideaId: string) {
    if (!session) return;
    setDevelopingId(ideaId);
    setError(null);
    try {
      const result = await developPitchIdea(getToken, session.id, ideaId);
      if (result.session) setSession(result.session);
      else {
        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            ideas: prev.ideas.map((i) =>
              i.id === ideaId
                ? { ...i, contentPlanId: result.planId, status: "developed" }
                : i
            ),
          };
        });
      }
      router.push(`/content-plans/${result.planId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create content plan");
      setDevelopingId(null);
    }
  }

  if (authLoading || loadingSession) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !appUser) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Sign in to pitch package ideas.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/content-plans"
        className="mb-4 inline-flex items-center text-sm font-medium text-sky-800 hover:underline"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Content plans
      </Link>

      <PageHeader
        title="Pitch ideas for a package"
        subtitle="Generate short one-liners from a service package and the client’s business — then open a Content plan for each idea you greenlight."
      />

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {!session ? (
        <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Service package</span>
            <Select
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              options={
                packagesLoading
                  ? [{ value: "", label: "Loading packages…" }]
                  : [
                      { value: "", label: "Select a package…" },
                      ...packages.map((p) => ({
                        value: p.id,
                        label: `${p.name}${
                          p.deliverables?.length
                            ? ` · ${p.deliverables
                                .map((d) => `${d.quantity} ${d.name}`)
                                .join(", ")}`
                            : ""
                        }`,
                      })),
                    ]
              }
            />
          </label>

          {selectedPackage?.deliverables?.length ? (
            <ul className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {selectedPackage.deliverables.map((d, i) => (
                <li key={`${d.name}-${i}`}>
                  {d.quantity}× {d.name}
                </li>
              ))}
            </ul>
          ) : null}

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Client name</span>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Northside Dental"
              className={textInputClassName()}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">
              Business context
            </span>
            <textarea
              value={businessContext}
              onChange={(e) => setBusinessContext(e.target.value)}
              rows={5}
              placeholder="What they sell, who they serve, offer, tone, must-mention points…"
              className={textInputClassName()}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Brand (optional)</span>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className={textInputClassName()}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">
                Product / offer (optional)
              </span>
              <input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className={textInputClassName()}
              />
            </label>
          </div>

          <Button
            type="button"
            disabled={busy || !packageId || !businessContext.trim()}
            onClick={() => void onGenerate()}
          >
            {busy ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-4 w-4" />
                Generate pitch one-liners
              </>
            )}
          </Button>
          <p className="text-xs text-slate-500">
            Generates up to 15 ideas per run, matching package deliverable counts. Full Content
            plans are only created when you click Generate plan on a row.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <p className="text-sm font-semibold text-slate-900">{session.packageName}</p>
            <p className="mt-0.5 text-sm text-slate-600">
              {session.clientName}
              {session.ideas?.length
                ? ` · ${session.ideas.length} ideas`
                : ""}
              {remaining ? ` · ${remaining} slots left` : " · package filled"}
            </p>
            <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
              {session.businessContext}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {remaining > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void onGenerateMore()}
                >
                  {busy ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Generate more ({Math.min(remaining, 15)})
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSession(null);
                  router.replace("/content-plans/pitch");
                }}
              >
                New pitch
              </Button>
            </div>
          </div>

          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {(session.ideas || []).map((idea) => {
              const developing = developingId === idea.id;
              return (
                <li
                  key={idea.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">
                      {idea.deliverableName}
                    </p>
                    {idea.title ? (
                      <p className="mt-0.5 text-sm font-medium text-slate-900">
                        {idea.title}
                      </p>
                    ) : null}
                    <p className="mt-1 text-sm text-slate-700">{idea.oneLiner}</p>
                  </div>
                  <div className="shrink-0">
                    {idea.contentPlanId ? (
                      <Link href={`/content-plans/${idea.contentPlanId}`}>
                        <Button type="button" size="sm" variant="secondary">
                          <Clapperboard className="mr-1 h-3.5 w-3.5" />
                          Open plan
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={Boolean(developingId)}
                        onClick={() => void onDevelop(idea.id)}
                      >
                        {developing ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Clapperboard className="mr-1 h-3.5 w-3.5" />
                        )}
                        Generate plan
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
