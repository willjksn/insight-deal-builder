"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import type { NavIcon } from "@/lib/navigation/navConfig";

export type StatAccent =
  | "violet"
  | "slate"
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "indigo";

const STAT_STYLES: Record<StatAccent, string> = {
  violet: "from-violet-400 to-violet-600 shadow-violet-500/20",
  slate: "from-slate-600 to-slate-800 shadow-slate-500/20",
  sky: "from-sky-400 to-blue-500 shadow-sky-500/25",
  emerald: "from-emerald-400 to-emerald-600 shadow-emerald-500/25",
  amber: "from-amber-400 to-orange-500 shadow-amber-500/25",
  rose: "from-rose-400 to-rose-600 shadow-rose-500/25",
  indigo: "from-indigo-500 to-violet-600 shadow-indigo-500/25",
};

export function StatCard({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: string | number;
  href?: string;
  accent: StatAccent;
}) {
  const inner = (
    <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardBody className="flex items-center gap-3 py-4">
        <div
          className={`flex h-10 min-w-10 items-center justify-center rounded-xl bg-gradient-to-br px-2 text-white text-sm font-bold shadow-md ${STAT_STYLES[accent]}`}
        >
          {value}
        </div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
      </CardBody>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function QuickAction({
  href,
  icon: Icon,
  label,
  description,
  accent,
}: {
  href: string;
  icon: NavIcon;
  label: string;
  description: string;
  accent: "violet" | "sky" | "indigo" | "emerald";
}) {
  const iconGradients = {
    violet: "from-violet-500 to-indigo-600",
    sky: "from-sky-400 to-blue-500",
    indigo: "from-indigo-500 to-violet-600",
    emerald: "from-emerald-500 to-teal-600",
  };
  const ringStyles = {
    violet: "ring-violet-100 hover:ring-violet-200",
    sky: "ring-sky-100 hover:ring-sky-200",
    indigo: "ring-indigo-100 hover:ring-indigo-200",
    emerald: "ring-emerald-100 hover:ring-emerald-200",
  };
  return (
    <Link href={href}>
      <Card className={`h-full ring-1 transition-all hover:-translate-y-0.5 hover:shadow-md ${ringStyles[accent]}`}>
        <CardBody className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${iconGradients[accent]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{label}</p>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}

export function SectionHeader({
  title,
  icon: Icon,
  href,
  actionLabel,
}: {
  title: string;
  icon: NavIcon;
  href: string;
  actionLabel: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <Icon className="h-5 w-5 text-slate-500" />
        {title}
      </h2>
      <Link href={href} className="shrink-0 text-sm font-medium text-sky-700 hover:text-sky-800 flex items-center gap-1">
        {actionLabel} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function EmptyPanel({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="py-4">
      <p className="text-sm text-slate-500">{text}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
