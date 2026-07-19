"use client";

import Link from "next/link";
import {
  FileText,
  LayoutGrid,
  ScrollText,
  ArrowRight,
  BookOpen,
  ListOrdered,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/Badge";
import { Agreement } from "@/lib/types";
import { ProductionBoard } from "@/lib/production/types";
import { ScriptWriterSession } from "@/lib/scriptWriter/types";

type SpineStep = {
  key: string;
  label: string;
  icon: typeof ScrollText;
  href: string;
  status: "empty" | "progress" | "ready";
  summary: string;
  detail?: string;
};

function statusLabel(status: SpineStep["status"]) {
  if (status === "ready") return "Ready";
  if (status === "progress") return "In progress";
  return "Not started";
}

function scriptStatus(session: ScriptWriterSession | undefined): SpineStep["status"] {
  if (!session) return "empty";
  if (session.status === "applied") return "ready";
  if (session.status === "script_ready") return "ready";
  return "progress";
}

function scriptSummary(session: ScriptWriterSession | undefined): string {
  if (!session) return "No script session linked yet";
  if (session.status === "applied") return `Applied — ${session.title}`;
  if (session.status === "script_ready") return `Script ready — ${session.title}`;
  if (session.status === "analysis_ready") return `Review inspiration — ${session.title}`;
  return `Drafting — ${session.title}`;
}

function boardStatus(board: ProductionBoard | null | undefined): SpineStep["status"] {
  if (!board) return "empty";
  const hasContent =
    board.people.length > 0 ||
    board.productionDays.length > 0 ||
    board.locations.some((l) => l.status === "booked") ||
    Boolean(board.scriptFountain);
  if (board.scriptSessionId || (board.productionDays.length > 0 && board.people.length > 0)) {
    return "ready";
  }
  return hasContent ? "progress" : "empty";
}

function boardSummary(board: ProductionBoard | null | undefined): string {
  if (!board) return "Open the board to add cast, days, and locations";
  const parts: string[] = [];
  if (board.people.length) parts.push(`${board.people.length} people`);
  if (board.productionDays.length) {
    parts.push(`${board.productionDays.length} shoot day${board.productionDays.length === 1 ? "" : "s"}`);
  }
  const booked = board.locations.filter((l) => l.status === "booked").length;
  if (booked) parts.push(`${booked} location${booked === 1 ? "" : "s"} booked`);
  if (board.scriptSessionId) parts.push("Script on board");
  return parts.length ? parts.join(" · ") : "Board created — add your team and schedule";
}

function agreementStatus(agreements: Agreement[]): SpineStep["status"] {
  if (!agreements.length) return "empty";
  if (agreements.some((a) => a.status === "signed" || a.status === "completed")) return "ready";
  return "progress";
}

function agreementSummary(agreements: Agreement[]): string {
  if (!agreements.length) return "No agreements yet";
  const signed = agreements.filter((a) => a.status === "signed" || a.status === "completed").length;
  const ready = agreements.filter((a) => a.status === "ready_for_signature").length;
  const parts = [`${agreements.length} total`];
  if (signed) parts.push(`${signed} signed`);
  if (ready) parts.push(`${ready} awaiting signature`);
  return parts.join(" · ");
}

function shotsStatus(board: ProductionBoard | null | undefined): SpineStep["status"] {
  if (!board?.productionDays.length) return "empty";
  const withShots = board.productionDays.some((d) => (d.shots?.length ?? 0) > 0);
  if (withShots) return "ready";
  return board.productionDays.length > 0 ? "progress" : "empty";
}

function shotsSummary(board: ProductionBoard | null | undefined): string {
  if (!board?.productionDays.length) return "Add shoot days on Prep, then build coverage";
  const total = board.productionDays.reduce((n, d) => n + (d.shots?.length ?? 0), 0);
  const framed = board.productionDays.reduce(
    (n, d) => n + (d.shots?.filter((s) => Boolean(s.referenceImageUrl)).length ?? 0),
    0
  );
  if (total) {
    return `${total} shot${total === 1 ? "" : "s"} · ${framed} framed · ${board.productionDays.length} day${board.productionDays.length === 1 ? "" : "s"}`;
  }
  return `${board.productionDays.length} shoot day${board.productionDays.length === 1 ? "" : "s"} — add coverage`;
}

function coverageHref(projectId: string): string {
  return `/projects/${projectId}/coverage`;
}

interface ProjectSpineProps {
  projectId: string;
  projectName: string;
  clientName?: string;
  scriptSession?: ScriptWriterSession;
  board?: ProductionBoard | null;
  agreements: Agreement[];
  showProduction: boolean;
  showScripts: boolean;
  canCreateDeal: boolean;
}

export function ProjectSpine({
  projectId,
  projectName,
  clientName,
  scriptSession,
  board,
  agreements,
  showProduction,
  showScripts,
  canCreateDeal,
}: ProjectSpineProps) {
  const idea = `A project for ${clientName || "client"}: ${projectName}`;
  const scriptParams = new URLSearchParams({ idea, title: projectName, projectId });

  const steps: SpineStep[] = [];

  if (showScripts) {
    steps.push({
      key: "script",
      label: "Script",
      icon: ScrollText,
      href: scriptSession ? `/script-writer/${scriptSession.id}` : `/script-writer?${scriptParams.toString()}`,
      status: scriptStatus(scriptSession),
      summary: scriptSummary(scriptSession),
    });
  }

  if (showProduction) {
    steps.push({
      key: "board",
      label: "Prep",
      icon: LayoutGrid,
      href: `/projects/${projectId}/production`,
      status: boardStatus(board),
      summary: boardSummary(board),
      detail: "People, locations, days — link & apply script here.",
    });

    steps.push({
      key: "coverage",
      label: "Coverage",
      icon: ListOrdered,
      href: coverageHref(projectId),
      status: shotsStatus(board),
      summary: shotsSummary(board),
      detail: "Shot bible — one shot = one frame. Edit DP fields and stills here.",
    });

    const firstDayId = board?.productionDays?.length
      ? [...board.productionDays].sort((a, b) => a.dayNumber - b.dayNumber)[0]?.id
      : undefined;
    if (firstDayId) {
      steps.push({
        key: "call-sheet",
        label: "Call sheet",
        icon: FileText,
        href: `/projects/${projectId}/production/days/${firstDayId}`,
        status: boardStatus(board) === "empty" ? "empty" : "ready",
        summary: `Day logistics + print · ${board!.productionDays.length} day${board!.productionDays.length === 1 ? "" : "s"}`,
        detail: "Crew call, schedule, coverage strip. Print the denser one-pager for set.",
      });
    }

    steps.push({
      key: "stage",
      label: "Stage",
      icon: LayoutGrid,
      href: `/projects/${projectId}/stage`,
      status: board ? "progress" : "empty",
      summary: "Optional lighting diagram for this project",
      detail: "Secondary to Coverage — open when you need a floor plan.",
    });

    steps.push({
      key: "reference",
      label: "Reference",
      icon: BookOpen,
      href: "/reference",
      status: "ready",
      summary: "Optional on-set camera / lens lookup",
      detail: "Global guide — not tied to this project’s shots.",
    });
  }

  if (canCreateDeal) {
    const latestAgreement = agreements[0];
    steps.push({
      key: "agreement",
      label: "Agreement",
      icon: FileText,
      href: latestAgreement ? `/agreements/${latestAgreement.id}` : `/agreements/new?projectId=${projectId}`,
      status: agreementStatus(agreements),
      summary: agreementSummary(agreements),
    });
  }

  if (!steps.length) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project spine</p>
        <p className="text-xs text-slate-400">Script → Prep → Coverage → Call sheet → Agreement</p>
      </div>
      <div
        className={cn(
          "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        )}
      >
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.key}
              href={step.href}
              className="group flex flex-col rounded-xl border border-slate-200/80 bg-white p-4 transition-all hover:border-sky-200 hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-slate-400 group-hover:text-sky-600" />
                  <span className="font-semibold text-slate-900">{step.label}</span>
                </div>
                <Badge
                  variant={
                    step.status === "ready" ? "success" : step.status === "progress" ? "info" : "default"
                  }
                  className="shrink-0 text-[10px]"
                >
                  {statusLabel(step.status)}
                </Badge>
              </div>
              <p className="text-sm text-slate-600 line-clamp-2">{step.summary}</p>
              {step.detail ? <p className="mt-1 text-xs text-slate-400">{step.detail}</p> : null}
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-sky-700">
                Open <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
