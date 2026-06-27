"use client";

import Link from "next/link";
import { Plus, FileText, Building2, Users, FolderKanban, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { useCollection } from "@/hooks/useCollection";
import { useAgreements } from "@/hooks/useAgreements";
import { useAuth } from "@/contexts/AuthContext";
import { canCreateQuotes } from "@/lib/utils/permissions";
import { Project, Client, Company } from "@/lib/types";

export default function DashboardPage() {
  const { appUser } = useAuth();
  const { data: agreements, loading: aLoading } = useAgreements();
  const { data: projects, loading: pLoading } = useCollection<Project>("projects");
  const { data: clients } = useCollection<Client>("clients");
  const { data: companies } = useCollection<Company>("companies");

  const loading = aLoading || pLoading;
  const drafts = agreements.filter((a) => a.status === "draft").length;
  const ready = agreements.filter((a) => a.status === "ready_for_signature").length;
  const signed = agreements.filter((a) => a.status === "signed" || a.status === "completed").length;

  const quickLinks = [
    ...(canCreateQuotes(appUser) ? [{ label: "New Agreement", href: "/agreements/new", icon: Plus, primary: true, accent: "sky" as const }] : []),
    { label: "Draft Agreements", href: "/agreements?status=draft", icon: FileText, count: drafts, accent: "slate" as const },
    { label: "Ready for Signature", href: "/agreements?status=ready_for_signature", icon: FileText, count: ready, accent: "sky" as const },
    { label: "Signed Agreements", href: "/agreements?status=signed", icon: FileText, count: signed, accent: "emerald" as const },
    { label: "Companies", href: "/companies", icon: Building2, count: companies.length, accent: "violet" as const },
    { label: "Clients", href: "/clients", icon: Users, count: clients.length, accent: "rose" as const },
  ];

  const accentStyles = {
    sky: { icon: "bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-sky-500/30", ring: "hover:ring-sky-200" },
    slate: { icon: "bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-slate-500/20", ring: "hover:ring-slate-200" },
    emerald: { icon: "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/30", ring: "hover:ring-emerald-200" },
    violet: { icon: "bg-gradient-to-br from-violet-400 to-violet-600 text-white shadow-violet-500/30", ring: "hover:ring-violet-200" },
    rose: { icon: "bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-rose-500/30", ring: "hover:ring-rose-200" },
  };

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Production Agreements, Payouts, Gear Use, and Client Sign-Offs"
        action={canCreateQuotes(appUser) ? (
          <Link href="/agreements/new"><Button size="touch"><Plus className="mr-2 h-5 w-5" />New Agreement</Button></Link>
        ) : undefined} />

      {loading ? <LoadingSpinner className="py-20" /> : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              const style = accentStyles[link.accent];
              return (
                <Link key={link.label} href={link.href}>
                  <Card className={`h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ring-1 ring-transparent ${style.ring} ${link.primary ? "ring-sky-200/80" : ""}`}>
                    <CardBody className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-md ${style.icon}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{link.label}</p>
                        {link.count !== undefined && (
                          <p className="text-2xl font-bold tabular-nums text-slate-800">{link.count}</p>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>

          <Card className="mb-8">
            <CardBody>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5" /> Recent Agreements</h2>
                <Link href="/agreements" className="text-sm font-medium text-sky-700 hover:text-sky-800 flex items-center gap-1">View all <ArrowRight className="h-4 w-4" /></Link>
              </div>
              {agreements.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No agreements yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {agreements.slice(0, 6).map((a) => (
                    <li key={a.id}>
                      <Link href={`/agreements/${a.id}`} className="flex items-center justify-between py-3 hover:bg-sky-50/50 -mx-2 px-2 rounded-xl transition-colors">
                        <div>
                          <p className="font-medium">{a.title}</p>
                          <p className="text-sm text-slate-500">{a.projectDetails?.projectName || "No project"} · ${a.paymentTerms?.totalFee?.toLocaleString() ?? "—"}</p>
                        </div>
                        <Badge>{a.status.replace(/_/g, " ")}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2"><FolderKanban className="h-5 w-5" /> Recent Projects</h2>
                <Link href="/projects" className="text-sm font-medium text-sky-700 hover:text-sky-800 flex items-center gap-1">View all <ArrowRight className="h-4 w-4" /></Link>
              </div>
              {projects.length === 0 ? <p className="text-sm text-slate-500 py-4">No projects yet.</p> : (
                <ul className="divide-y divide-slate-100">
                  {projects.slice(0, 8).map((p) => (
                    <li key={p.id}>
                      <Link href={`/projects/${p.id}`} className="flex items-center justify-between py-3 hover:bg-sky-50/50 -mx-2 px-2 rounded-xl transition-colors">
                        <div>
                          <p className="font-medium">{p.projectName}</p>
                          <p className="text-sm text-slate-500">{p.clientName || "No client"} · ${p.totalProjectFee.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge>{p.status.replace(/_/g, " ")}</Badge>
                          <Button size="sm" variant="outline">Open</Button>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
