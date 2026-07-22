"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FileText,
  FolderKanban,
  ScrollText,
  LayoutGrid,
  PenLine,
  BookOpen,
  Clapperboard,
  CalendarClock,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { useCollection } from "@/hooks/useCollection";
import { useAgreements } from "@/hooks/useAgreements";
import { useAuth } from "@/contexts/AuthContext";
import { scriptWriterListSessions } from "@/lib/scriptWriter/apiClient";
import { ScriptWriterSession } from "@/lib/scriptWriter/types";
import { canManageProjects, canUseProductionTools } from "@/lib/utils/permissions";
import { Project } from "@/lib/types";
import { StatCard, QuickAction, SectionHeader, EmptyPanel } from "./widgets";
import { WORKSPACE_TAGLINES } from "@/lib/workspace/types";

export function ProductionDashboard() {
  const { user, appUser } = useAuth();
  const { data: agreements, loading: aLoading } = useAgreements();
  const { data: projects, loading: pLoading } = useCollection<Project>("projects");
  const showProduction = canUseProductionTools(appUser);
  const [scriptSessions, setScriptSessions] = useState<ScriptWriterSession[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(false);

  const loading = aLoading || pLoading || (showProduction && scriptsLoading);

  useEffect(() => {
    if (!user || !showProduction) return;
    setScriptsLoading(true);
    scriptWriterListSessions(() => user.getIdToken())
      .then((res) => setScriptSessions((res.sessions as ScriptWriterSession[]).slice(0, 5)))
      .catch(() => setScriptSessions([]))
      .finally(() => setScriptsLoading(false));
  }, [user, showProduction]);

  const activeProjects = projects.filter(
    (p) => p.status !== "completed" && p.status !== "archived"
  );
  // Captured once for the component's lifetime so the "upcoming" cutoff is stable across renders.
  const [now] = useState(() => Date.now());
  const upcomingShoots = projects
    .filter((p) => {
      if (!p.shootDate) return false;
      const t = new Date(p.shootDate).getTime();
      return !Number.isNaN(t) && t >= now;
    })
    .sort((a, b) => new Date(a.shootDate!).getTime() - new Date(b.shootDate!).getTime())
    .slice(0, 6);
  const signed = agreements.filter(
    (a) => a.status === "signed" || a.status === "completed"
  ).length;

  return (
    <div className="pb-24 lg:pb-0">
      <PageHeader
        title="Production dashboard"
        subtitle={WORKSPACE_TAGLINES.production}
        action={
          canManageProjects(appUser) ? (
            <Link href="/projects">
              <Button size="touch" variant="outline">
                <FolderKanban className="mr-2 h-5 w-5" />
                All projects
              </Button>
            </Link>
          ) : undefined
        }
      />

      {loading ? (
        <LoadingSpinner className="py-20" />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Active projects" value={activeProjects.length} href="/projects" accent="violet" />
            <StatCard label="Filming next" value={upcomingShoots.length} href="/calendar" accent="sky" />
            <StatCard label="Scripts in flight" value={scriptSessions.length} href="/script-writer" accent="indigo" />
            <StatCard label="Signed deals" value={signed} href="/agreements?status=signed" accent="emerald" />
          </div>

          {showProduction ? (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Jump back in
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <QuickAction href="/script-writer" icon={ScrollText} label="Script writer" description="Idea → full script" accent="violet" />
                <QuickAction href="/projects" icon={LayoutGrid} label="Pre-production" description="Open a project board" accent="indigo" />
                <QuickAction href="/reference" icon={BookOpen} label="Reference guide" description="FX6 & lens lookup" accent="sky" />
                <QuickAction href="/stage" icon={LayoutGrid} label="Stage planner" description="Lighting diagram" accent="indigo" />
              </div>
            </section>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardBody>
                <SectionHeader title="Active projects" icon={FolderKanban} href="/projects" actionLabel="All projects" />
                {activeProjects.length === 0 ? (
                  <EmptyPanel
                    text="Start from Projects — script, Prep, Coverage, call sheets, and deals live there."
                    action={
                      canManageProjects(appUser) ? (
                        <Link href="/projects">
                          <Button size="sm" variant="outline">
                            <FolderKanban className="mr-1.5 h-4 w-4" />
                            Create a project
                          </Button>
                        </Link>
                      ) : undefined
                    }
                  />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {activeProjects.slice(0, 6).map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/projects/${p.id}`}
                          className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{p.projectName}</p>
                            <p className="truncate text-sm text-slate-500">
                              {p.clientName || "No client"} · ${p.totalProjectFee.toLocaleString()}
                            </p>
                          </div>
                          <Badge>{p.status.replace(/_/g, " ")}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <SectionHeader title="Upcoming shoots" icon={CalendarClock} href="/calendar" actionLabel="Calendar" />
                {upcomingShoots.length === 0 ? (
                  <EmptyPanel text="No shoot dates scheduled yet. Set a shoot date on a project to see it here." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {upcomingShoots.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/projects/${p.id}`}
                          className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{p.projectName}</p>
                            <p className="truncate text-sm text-slate-500">{p.location || "Location TBD"}</p>
                          </div>
                          <Badge>
                            {new Date(p.shootDate!).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            {showProduction ? (
              <Card>
                <CardBody>
                  <SectionHeader title="Recent scripts" icon={PenLine} href="/script-writer" actionLabel="Script writer" />
                  {scriptSessions.length === 0 ? (
                    <EmptyPanel
                      text="No scripts yet — start with an idea or reference clip."
                      action={
                        <Link href="/script-writer">
                          <Button size="sm" variant="outline">
                            <PenLine className="mr-1.5 h-4 w-4" />
                            New script
                          </Button>
                        </Link>
                      }
                    />
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {scriptSessions.map((s) => (
                        <li key={s.id}>
                          <Link
                            href={`/script-writer/${s.id}`}
                            className="block py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl transition-colors"
                          >
                            <p className="truncate font-medium text-slate-900">{s.title}</p>
                            <p className="text-xs text-slate-500">
                              {s.status === "applied"
                                ? "Applied"
                                : s.status === "script_ready"
                                  ? "Script ready"
                                  : s.status === "analysis_ready"
                                    ? "Review analysis"
                                    : "In progress"}
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            ) : null}

            <Card>
              <CardBody>
                <SectionHeader title="Recent agreements" icon={FileText} href="/agreements" actionLabel="All deals" />
                {agreements.length === 0 ? (
                  <EmptyPanel text="No agreements yet." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {agreements.slice(0, 6).map((a) => (
                      <li key={a.id}>
                        <Link
                          href={`/agreements/${a.id}`}
                          className="flex items-center justify-between gap-2 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{a.title}</p>
                            <p className="truncate text-sm text-slate-500">
                              {a.projectDetails?.projectName || "No project"}
                            </p>
                          </div>
                          <Badge>{a.status.replace(/_/g, " ")}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          <p className="mt-8 flex items-center gap-2 text-xs text-slate-400">
            <Clapperboard className="h-4 w-4" />
            Production workspace — switch to Business to work opportunities and proposals.
          </p>
        </>
      )}
    </div>
  );
}
