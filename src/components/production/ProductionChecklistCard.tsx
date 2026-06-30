"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clapperboard,
  FileText,
  Lightbulb,
  MapPin,
} from "lucide-react";
import { BoardCard } from "@/components/production/BoardCard";
import { Button } from "@/components/ui/Button";
import { Project } from "@/lib/types";
import {
  applyChecklistExample,
  buildChecklistForMode,
  checklistItemsByPhase,
  checklistProgress,
  isClientStyleProject,
  PORTFOLIO_CHECKLIST_EXAMPLE,
  ProductionChecklistItem,
  ProductionChecklistMode,
} from "@/lib/production/checklist";
import { cn } from "@/lib/utils/cn";

interface ProductionChecklistCardProps {
  project: Project;
  mode: ProductionChecklistMode;
  items: ProductionChecklistItem[];
  scriptSessionId?: string;
  hasScoutSessions: boolean;
  hasAgreement: boolean;
  hasSignedAgreement?: boolean;
  onSyncProgress?: () => void;
  onChange: (mode: ProductionChecklistMode, items: ProductionChecklistItem[]) => void;
}

export function ProductionChecklistCard({
  project,
  mode,
  items,
  scriptSessionId,
  hasScoutSessions,
  hasAgreement,
  hasSignedAgreement,
  onSyncProgress,
  onChange,
}: ProductionChecklistCardProps) {
  const [showExample, setShowExample] = useState(false);
  const suggestClientMode = isClientStyleProject(project) && mode === "portfolio";

  const groups = useMemo(() => checklistItemsByPhase(items, mode), [items, mode]);
  const { done, total } = useMemo(() => checklistProgress(items, mode), [items, mode]);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const toggleItem = (stepKey: string) => {
    onChange(
      mode,
      items.map((i) => (i.stepKey === stepKey ? { ...i, done: !i.done } : i))
    );
  };

  const updateNotes = (stepKey: string, notes: string) => {
    onChange(
      mode,
      items.map((i) => (i.stepKey === stepKey ? { ...i, notes: notes || undefined } : i))
    );
  };

  const switchMode = (next: ProductionChecklistMode) => {
    if (next === mode) return;
    onChange(next, buildChecklistForMode(next, items));
  };

  const loadExample = () => {
    onChange("portfolio", applyChecklistExample(buildChecklistForMode("portfolio", items), PORTFOLIO_CHECKLIST_EXAMPLE));
    setShowExample(true);
  };

  return (
    <BoardCard
      title="Production checklist"
      collapsible
      defaultOpen
      summary={`${done}/${total} complete · ${mode === "client" ? "Client project" : "Portfolio / spec"}`}
      action={
        <span className="text-xs font-medium tabular-nums text-sky-700">{pct}%</span>
      }
      className="mb-6"
      bodyClassName="px-4 py-4"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <ModeButton
            active={mode === "portfolio"}
            onClick={() => switchMode("portfolio")}
            icon={Clapperboard}
            label="Portfolio / spec"
          />
          <ModeButton
            active={mode === "client"}
            onClick={() => switchMode("client")}
            icon={Briefcase}
            label="Client project"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {onSyncProgress && (
            <Button type="button" size="sm" variant="outline" onClick={onSyncProgress}>
              Sync from project
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={() => setShowExample((v) => !v)}>
            <Lightbulb className="mr-1.5 h-3.5 w-3.5" />
            {showExample ? "Hide example" : "Filled example"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={loadExample}>
            Load example into checklist
          </Button>
        </div>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-600 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {suggestClientMode && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          This project has a client linked — consider switching to{" "}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => switchMode("client")}
          >
            Client project
          </button>{" "}
          for agreement, fee, and revision checkpoints.
        </div>
      )}

      {mode === "portfolio" ? (
        <p className="mb-4 text-xs text-slate-500">
          Default for spec trailers, skits, and cinematic reels. Switch to{" "}
          <strong className="font-medium text-slate-700">Client project</strong> when you have a
          paid job — adds agreement, fee, and revision checkpoints.
        </p>
      ) : (
        <p className="mb-4 text-xs text-slate-500">
          Full business + creative track for paid work. Links below connect to agreements and tools
          on this project.
        </p>
      )}

      {showExample && (
        <div className="mb-5 rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3">
          <p className="text-sm font-semibold text-amber-950">{PORTFOLIO_CHECKLIST_EXAMPLE.title}</p>
          <p className="mt-0.5 text-xs text-amber-900/80">{PORTFOLIO_CHECKLIST_EXAMPLE.subtitle}</p>
          <ul className="mt-3 space-y-2 text-xs text-amber-950/90">
            {PORTFOLIO_CHECKLIST_EXAMPLE.entries.map((entry) => {
              const template = items.find((i) => i.stepKey === entry.stepKey);
              return (
                <li key={entry.stepKey} className="flex gap-2">
                  <span className="mt-0.5 shrink-0">
                    {entry.done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-amber-400" />
                    )}
                  </span>
                  <span>
                    <strong>{template?.label ?? entry.stepKey}:</strong> {entry.notes}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group.phase}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {group.label}
            </h4>
            <ul className="space-y-2">
              {group.items.map((item) => (
                <ChecklistRow
                  key={item.stepKey}
                  item={item}
                  projectId={project.id}
                  scriptSessionId={scriptSessionId}
                  hasScoutSessions={hasScoutSessions}
                  hasAgreement={hasAgreement}
                  onToggle={() => toggleItem(item.stepKey)}
                  onNotesChange={(notes) => updateNotes(item.stepKey, notes)}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </BoardCard>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Clapperboard;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-sky-300 bg-sky-50 text-sky-900 ring-1 ring-sky-200"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function ChecklistRow({
  item,
  projectId,
  scriptSessionId,
  hasScoutSessions,
  hasAgreement,
  onToggle,
  onNotesChange,
}: {
  item: ProductionChecklistItem;
  projectId: string;
  scriptSessionId?: string;
  hasScoutSessions: boolean;
  hasAgreement: boolean;
  onToggle: () => void;
  onNotesChange: (notes: string) => void;
}) {
  const [expanded, setExpanded] = useState(Boolean(item.notes?.trim()));

  const quickLinks = getQuickLinks(item.stepKey, {
    projectId,
    scriptSessionId,
    hasScoutSessions,
    hasAgreement,
  });

  return (
    <li
      className={cn(
        "rounded-xl border px-3 py-2.5 transition-colors",
        item.done ? "border-emerald-200/80 bg-emerald-50/40" : "border-slate-200/80 bg-white"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="mt-0.5 shrink-0 rounded-md p-0.5 text-slate-400 hover:text-sky-600"
          aria-label={item.done ? `Mark ${item.label} incomplete` : `Mark ${item.label} complete`}
        >
          {item.done ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <button
              type="button"
              onClick={onToggle}
              className={cn(
                "text-left text-sm font-medium",
                item.done ? "text-slate-500 line-through" : "text-slate-900"
              )}
            >
              {item.label}
            </button>
            {quickLinks.length > 0 && (
              <span className="flex flex-wrap gap-1.5">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-sky-700 hover:bg-sky-50"
                  >
                    <link.icon className="h-3 w-3" />
                    {link.label}
                  </Link>
                ))}
              </span>
            )}
          </div>
          {item.hint && !expanded && !item.notes && (
            <p className="mt-0.5 text-xs text-slate-500">{item.hint}</p>
          )}
          {(item.notes || expanded) && (
            <textarea
              value={item.notes ?? ""}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder={item.hint ?? "Notes…"}
              rows={2}
              className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          )}
          {!expanded && !item.notes && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-1 text-[11px] font-medium text-sky-600 hover:text-sky-800"
            >
              Add notes
            </button>
          )}
        </div>
        {(item.notes || expanded) && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 text-slate-400 hover:text-slate-600"
            aria-label="Toggle notes"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </button>
        )}
      </div>
    </li>
  );
}

function getQuickLinks(
  stepKey: string,
  ctx: {
    projectId: string;
    scriptSessionId?: string;
    hasScoutSessions: boolean;
    hasAgreement: boolean;
  }
): { href: string; label: string; icon: typeof FileText }[] {
  const { projectId, scriptSessionId, hasScoutSessions, hasAgreement } = ctx;
  const links: { href: string; label: string; icon: typeof FileText }[] = [];

  if (stepKey === "fee_agreement" || stepKey === "scope") {
    if (hasAgreement) {
      links.push({
        href: `/projects/${projectId}`,
        label: "Agreement",
        icon: FileText,
      });
    } else {
      links.push({
        href: `/agreements/new?projectId=${projectId}`,
        label: "New agreement",
        icon: FileText,
      });
      links.push({
        href: `/quick-quote`,
        label: "Quick quote",
        icon: FileText,
      });
    }
  }

  if (stepKey === "concept_script") {
    links.push({
      href: scriptSessionId ? `/script-writer/${scriptSessionId}` : `/script-writer?projectId=${projectId}`,
      label: "Script writer",
      icon: FileText,
    });
  }

  if (stepKey === "visual_plan") {
    links.push({
      href: hasScoutSessions ? `/scout` : `/scout/new?projectId=${projectId}`,
      label: hasScoutSessions ? "Shot Scout" : "New scout",
      icon: MapPin,
    });
  }

  if (stepKey === "schedule") {
    links.push({
      href: `/projects/${projectId}/production`,
      label: "Board",
      icon: Clapperboard,
    });
  }

  return links;
}
