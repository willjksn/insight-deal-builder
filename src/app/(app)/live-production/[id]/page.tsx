"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  liveAnalyzeOpportunity,
  liveBidDecision,
  liveConvertToProject,
  liveGetOpportunity,
  liveRematchOpportunity,
  liveUpdateOpportunity,
} from "@/lib/liveProduction/apiClient";
import {
  deadlineAlert,
  formatDeadline,
  formatValueRange,
  statusBadgeVariant,
  statusLabel,
} from "@/lib/liveProduction/format";
import {
  LIVE_NO_BID_REASONS,
  LIVE_OPPORTUNITY_STATUSES,
  type LiveNoBidReason,
  type LiveOpportunity,
} from "@/lib/liveProduction/types";
import { formatCurrency } from "@/lib/utils/format";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";

function MatchIcon({ ok }: { ok: "owned" | "partial" | "subrent" | "unmatched" | string }) {
  if (ok === "owned" || ok === "available") return <span className="text-emerald-700">✓</span>;
  if (ok === "partial" || ok === "possible_freelancer") return <span className="text-amber-700">⚠</span>;
  return <span className="text-red-700">✕</span>;
}

export default function LiveOpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, appUser } = useAuth();
  const router = useRouter();
  const canManage = canManageRevenueOpportunities(appUser);
  const [opp, setOpp] = useState<LiveOpportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [noBidReason, setNoBidReason] = useState<LiveNoBidReason>("other");
  const [noBidNotes, setNoBidNotes] = useState("");
  const [note, setNote] = useState("");
  const [assistantQ, setAssistantQ] = useState("What equipment do we need?");
  const [assistantA, setAssistantA] = useState<string | null>(null);

  const load = async () => {
    if (!user || !id) return;
    setLoading(true);
    setError(null);
    try {
      const { opportunity } = await liveGetOpportunity(() => user.getIdToken(), id);
      setOpp(opportunity);
      setNote(opportunity.notes || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user, id]);

  const run = async (fn: () => Promise<LiveOpportunity>) => {
    if (!canManage) return;
    setBusy(true);
    setError(null);
    try {
      setOpp(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const answerAssistant = () => {
    if (!opp) return;
    const q = assistantQ.toLowerCase();
    if (q.includes("own") || q.includes("rent") || q.includes("equipment")) {
      setAssistantA(
        [
          `Equipment match ${opp.equipmentMatchPct}% · owned coverage ${opp.ownedCoveragePct}%.`,
          `Sub-rental: ${opp.subRentalSummary || "none identified"}.`,
          `Owned: ${opp.equipmentMatches.filter((m) => m.status === "owned").map((m) => m.label).join(", ") || "—"}.`,
          `Gaps: ${opp.equipmentMatches
            .filter((m) => m.status !== "owned")
            .map((m) => `${m.label} (${m.status})`)
            .join("; ") || "—"}.`,
        ].join("\n")
      );
      return;
    }
    if (q.includes("crew")) {
      setAssistantA(
        `Crew match ${opp.crewMatchPct}%.\n` +
          opp.crewMatches
            .map((m) => `${m.role} ×${m.quantityNeeded}: ${m.status}`)
            .join("\n")
      );
      return;
    }
    if (q.includes("risk") || q.includes("form") || q.includes("admin")) {
      setAssistantA(
        [
          opp.fitScore.explanation,
          "Admin requirements:",
          ...opp.adminRequirements.map((a) => `• [${a.priority}] ${a.label}`),
        ].join("\n")
      );
      return;
    }
    if (q.includes("charge") || q.includes("financial") || q.includes("margin")) {
      const f = opp.financialEstimate;
      setAssistantA(
        [
          `Estimated client revenue: ${formatValueRange(f.clientRevenueLow, f.clientRevenueHigh)}`,
          `Internal equipment ~ ${formatCurrency(f.internalEquipmentRevenue)}`,
          `Labor ~ ${formatCurrency(f.labor)} · Sub-rental ~ ${formatCurrency(f.subRental)}`,
          `Gross margin estimate ~ ${f.estimatedGrossMarginPct ?? "—"}%`,
          ...(f.assumptions || []),
        ].join("\n")
      );
      return;
    }
    setAssistantA(
      [
        opp.summary || opp.title,
        `Fit ${opp.fitScore.total}/100 — ${opp.fitScore.explanation}`,
        `Deadline: ${formatDeadline(opp.bidDeadline)}`,
      ].join("\n\n")
    );
  };

  if (loading) return <LoadingSpinner />;
  if (!opp) {
    return <p className="text-sm text-red-600">{error || "Opportunity not found"}</p>;
  }

  const alert = deadlineAlert(opp);
  const reasonsToBid = [
    opp.equipmentMatchPct >= 70 ? `${opp.equipmentMatchPct}% equipment match` : null,
    opp.travelClass === "local" || opp.travelClass === "regional"
      ? "Strong geographic fit"
      : null,
    (opp.financialEstimate.estimatedGrossMarginPct || 0) >= 30
      ? "Healthy estimated margin"
      : null,
    opp.tags.includes("recurring") ? "Recurring contract potential" : null,
  ].filter(Boolean) as string[];
  const risks = [
    opp.subRentalSummary && opp.subRentalSummary !== "None"
      ? `Sub-rent: ${opp.subRentalSummary}`
      : null,
    ...opp.adminRequirements.slice(0, 3).map((a) => a.label),
    opp.crewMatchPct < 70 ? "Crew gaps need sourcing" : null,
  ].filter(Boolean) as string[];

  return (
    <>
      <PageHeader
        title={opp.title}
        subtitle={`${opp.organizationName} · ${opp.opportunityType}`}
        action={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="touch"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const { opportunity } = await liveAnalyzeOpportunity(
                      () => user!.getIdToken(),
                      opp.id
                    );
                    return opportunity;
                  })
                }
              >
                Re-analyze AI
              </Button>
              <Button
                size="touch"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const { opportunity } = await liveRematchOpportunity(
                      () => user!.getIdToken(),
                      opp.id
                    );
                    return opportunity;
                  })
                }
              >
                Rematch inventory
              </Button>
              <Button
                size="touch"
                onClick={async () => {
                  if (!user) return;
                  setBusy(true);
                  try {
                    await liveUpdateOpportunity(() => user.getIdToken(), opp.id, {
                      status: "quote_building",
                    });
                    router.push(
                      `/quick-quote?liveOpportunityId=${encodeURIComponent(opp.id)}&title=${encodeURIComponent(opp.title)}`
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Build quote
              </Button>
              <Button
                size="touch"
                variant="secondary"
                disabled={busy}
                onClick={async () => {
                  if (!user) return;
                  setBusy(true);
                  try {
                    const result = await liveConvertToProject(() => user.getIdToken(), opp.id);
                    router.push(`/projects/${result.projectId}`);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Convert failed");
                    setBusy(false);
                  }
                }}
              >
                Create project
              </Button>
            </div>
          ) : undefined
        }
      />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {alert && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 ring-1 ring-amber-200">
          {alert}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={statusBadgeVariant(opp.status)}>{statusLabel(opp.status)}</Badge>
        <Badge variant="info">Fit {opp.fitScore.total}/100</Badge>
        <Badge>Equip {opp.equipmentMatchPct}%</Badge>
        <Badge>Crew {opp.crewMatchPct}%</Badge>
        {opp.isPartnerSubcontract && <Badge variant="warning">Partner / subcontract</Badge>}
        {opp.projectId && (
          <Link href={`/projects/${opp.projectId}`} className="text-sm font-medium text-sky-800 underline">
            Open linked project
          </Link>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <p className="font-medium text-slate-900">Opportunity overview</p>
            </CardHeader>
            <CardBody className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                ["Organization", opp.organizationName],
                ["Source", opp.sourceLabel || opp.sourceKind],
                ["Source URL", opp.sourceUrl || "—"],
                ["Solicitation #", opp.solicitationNumber || "—"],
                ["Location", opp.location || "—"],
                ["Venue", opp.venue || "—"],
                ["Event date(s)", opp.eventDates || "—"],
                ["Setup", formatDeadline(opp.setupDate)],
                ["Strike", formatDeadline(opp.strikeDate)],
                ["Bid deadline", formatDeadline(opp.bidDeadline)],
                ["Questions due", formatDeadline(opp.questionDeadline)],
                ["Site visit", formatDeadline(opp.siteVisitDate)],
                [
                  "Estimated value",
                  formatValueRange(opp.estimatedValueLow, opp.estimatedValueHigh),
                ],
                ["Contract term", opp.contractTerm || "—"],
                ["Contact", [opp.contactName, opp.contactEmail, opp.contactPhone].filter(Boolean).join(" · ") || "—"],
                [
                  "Distance",
                  opp.distanceMiles != null
                    ? `${opp.distanceMiles} miles (${opp.travelClass || "—"})`
                    : "—",
                ],
                ["Tags", opp.tags.join(", ") || "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{k}</p>
                  <p className="text-slate-800 break-words">{v}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          {opp.summary && (
            <Card>
              <CardHeader>
                <p className="font-medium text-slate-900">Summary</p>
              </CardHeader>
              <CardBody className="text-sm text-slate-700 whitespace-pre-wrap">{opp.summary}</CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <p className="font-medium text-slate-900">
                Equipment match — {opp.equipmentMatchPct}%
              </p>
              <p className="text-sm text-slate-600">
                Owned coverage {opp.ownedCoveragePct}% · {opp.subRentalSummary || "No sub-rent gaps"}
              </p>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              {opp.equipmentMatches.map((m) => (
                <div key={m.requirementId} className="flex gap-2">
                  <MatchIcon ok={m.status} />
                  <span>
                    {m.label}
                    {m.status === "partial"
                      ? ` — own ${m.quantityOwned} / need ${m.quantityNeeded}`
                      : m.status === "owned"
                        ? " — Owned"
                        : " — Not owned / source"}
                  </span>
                </div>
              ))}
              {opp.equipmentMatches.length === 0 && (
                <p className="text-slate-500">No equipment requirements yet. Run AI analysis.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <p className="font-medium text-slate-900">Crew match — {opp.crewMatchPct}%</p>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              {opp.crewMatches.map((m) => (
                <div key={m.requirementId} className="flex gap-2">
                  <MatchIcon ok={m.status} />
                  <span>
                    {m.role} ×{m.quantityNeeded} — {m.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
              {opp.crewMatches.length === 0 && (
                <p className="text-slate-500">No crew requirements yet.</p>
              )}
            </CardBody>
          </Card>

          {opp.adminRequirements.length > 0 && (
            <Card>
              <CardHeader>
                <p className="font-medium text-slate-900">Administrative requirements</p>
              </CardHeader>
              <CardBody className="space-y-2 text-sm">
                {opp.adminRequirements.map((a) => (
                  <div key={a.id}>
                    <Badge className="mr-2">{a.priority}</Badge>
                    {a.label}
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <p className="font-medium text-slate-900">Fit score — {opp.fitScore.total}/100</p>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-slate-700">
              <p>{opp.fitScore.explanation}</p>
              <ul className="space-y-1 text-xs text-slate-600">
                <li>Equipment {opp.fitScore.equipmentMatch}</li>
                <li>Crew {opp.fitScore.crewMatch}</li>
                <li>Profitability {opp.fitScore.profitability}</li>
                <li>Geographic {opp.fitScore.geographicFit}</li>
                <li>Org quality {opp.fitScore.organizationQuality}</li>
                <li>Strategic {opp.fitScore.strategicValue}</li>
                <li>Win probability {opp.fitScore.winProbability}</li>
                <li>Complexity/risk {opp.fitScore.complexityRisk}</li>
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <p className="font-medium text-slate-900">Financial estimate</p>
              <p className="text-xs text-amber-800">Preliminary only — not a formal quote</p>
            </CardHeader>
            <CardBody className="space-y-1 text-sm">
              <p>
                Client revenue:{" "}
                {formatValueRange(
                  opp.financialEstimate.clientRevenueLow,
                  opp.financialEstimate.clientRevenueHigh
                )}
              </p>
              <p>Internal equipment: {formatCurrency(opp.financialEstimate.internalEquipmentRevenue)}</p>
              <p>Labor: {formatCurrency(opp.financialEstimate.labor)}</p>
              <p>Sub-rental: {formatCurrency(opp.financialEstimate.subRental)}</p>
              <p>Transportation: {formatCurrency(opp.financialEstimate.transportation)}</p>
              <p>Other: {formatCurrency(opp.financialEstimate.otherCosts)}</p>
              <p className="font-medium">
                Est. gross margin: {opp.financialEstimate.estimatedGrossMarginPct ?? "—"}%
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <p className="font-medium text-slate-900">Bid / no-bid</p>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div>
                <p className="mb-1 font-medium text-emerald-800">Reasons to bid</p>
                <ul className="list-disc pl-5 text-slate-700">
                  {reasonsToBid.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                  {reasonsToBid.length === 0 && <li>Review match details</li>}
                </ul>
              </div>
              <div>
                <p className="mb-1 font-medium text-amber-800">Risks</p>
                <ul className="list-disc pl-5 text-slate-700">
                  {risks.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
              {canManage && (
                <>
                  <Button
                    size="touch"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const { opportunity } = await liveBidDecision(
                          () => user!.getIdToken(),
                          opp.id,
                          { decision: "pursue" }
                        );
                        return opportunity;
                      })
                    }
                  >
                    Pursue opportunity
                  </Button>
                  <Select
                    label="No-bid reason"
                    value={noBidReason}
                    onChange={(e) => setNoBidReason(e.target.value as LiveNoBidReason)}
                    options={LIVE_NO_BID_REASONS.map((r) => ({
                      value: r.value,
                      label: r.label,
                    }))}
                    touch
                  />
                  <Textarea
                    label="No-bid notes"
                    value={noBidNotes}
                    onChange={(e) => setNoBidNotes(e.target.value)}
                    rows={2}
                  />
                  <Button
                    size="touch"
                    variant="danger"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const { opportunity } = await liveBidDecision(
                          () => user!.getIdToken(),
                          opp.id,
                          {
                            decision: "no_bid",
                            noBidReason,
                            noBidNotes,
                          }
                        );
                        return opportunity;
                      })
                    }
                  >
                    No bid
                  </Button>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <p className="font-medium text-slate-900">AI opportunity assistant</p>
            </CardHeader>
            <CardBody className="space-y-3">
              <Input
                label="Ask"
                value={assistantQ}
                onChange={(e) => setAssistantQ(e.target.value)}
                touch
              />
              <Button size="touch" variant="outline" onClick={answerAssistant}>
                Ask
              </Button>
              {assistantA && (
                <pre className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs text-slate-700 ring-1 ring-slate-200">
                  {assistantA}
                </pre>
              )}
            </CardBody>
          </Card>

          {canManage && (
            <Card>
              <CardHeader>
                <p className="font-medium text-slate-900">Status & notes</p>
              </CardHeader>
              <CardBody className="space-y-3">
                <Select
                  label="Status"
                  value={opp.status}
                  onChange={(e) =>
                    run(async () => {
                      const { opportunity } = await liveUpdateOpportunity(
                        () => user!.getIdToken(),
                        opp.id,
                        { status: e.target.value as LiveOpportunity["status"] }
                      );
                      return opportunity;
                    })
                  }
                  options={LIVE_OPPORTUNITY_STATUSES.map((s) => ({
                    value: s.value,
                    label: s.label,
                  }))}
                  touch
                />
                <Textarea
                  label="Notes"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                />
                <Button
                  size="touch"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const { opportunity } = await liveUpdateOpportunity(
                        () => user!.getIdToken(),
                        opp.id,
                        { notes: note, saved: true }
                      );
                      return opportunity;
                    })
                  }
                >
                  Save note
                </Button>
                <Button
                  size="touch"
                  variant="outline"
                  onClick={() => {
                    const body = encodeURIComponent(
                      [
                        `Sub-rental request for: ${opp.title}`,
                        `Organization: ${opp.organizationName}`,
                        `Needed: ${opp.subRentalSummary || "see equipment gaps"}`,
                        "",
                        ...opp.equipmentMatches
                          .filter((m) => m.status !== "owned")
                          .map(
                            (m) =>
                              `- ${m.label}: need ${m.quantityNeeded}, own ${m.quantityOwned}`
                          ),
                      ].join("\n")
                    );
                    window.location.href = `mailto:?subject=${encodeURIComponent(
                      `Subrent quote — ${opp.title}`
                    )}&body=${body}`;
                  }}
                >
                  Request subrent quote (email)
                </Button>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
