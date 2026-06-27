import { cn } from "@/lib/utils/cn";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { Card, CardBody } from "./Card";

const accentStyles = {
  sky: {
    icon: "bg-gradient-to-br from-sky-400 to-blue-500 shadow-sky-500/25",
    ring: "ring-sky-100",
  },
  blue: {
    icon: "bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-500/25",
    ring: "ring-blue-100",
  },
  violet: {
    icon: "bg-gradient-to-br from-violet-400 to-violet-600 shadow-violet-500/25",
    ring: "ring-violet-100",
  },
  emerald: {
    icon: "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/25",
    ring: "ring-emerald-100",
  },
  rose: {
    icon: "bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/25",
    ring: "ring-rose-100",
  },
  slate: {
    icon: "bg-gradient-to-br from-slate-600 to-slate-800 shadow-slate-500/20",
    ring: "ring-slate-100",
  },
};

export type SectionAccent = keyof typeof accentStyles;

export function PageSection({
  icon: Icon,
  title,
  description,
  accent = "sky",
  children,
  className,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  accent?: SectionAccent;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  const style = accentStyles[accent];
  return (
    <Card className={cn("ring-1", style.ring, className)}>
      <CardBody className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md",
                style.icon
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-slate-900">{title}</h2>
              {description && (
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
              )}
            </div>
          </div>
          {action}
        </div>
        {children}
      </CardBody>
    </Card>
  );
}

export function InfoCallout({
  children,
  variant = "sky",
}: {
  children: ReactNode;
  variant?: "sky" | "emerald" | "blue";
}) {
  const styles = {
    sky: "border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 text-sky-950",
    emerald: "border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900",
    blue: "border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-900",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm shadow-sm", styles[variant])}>
      {children}
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-slate-50/80 px-3 py-2.5 ring-1 ring-slate-100">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

export function ContentPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 ring-1 ring-slate-100",
        className
      )}
    >
      {children}
    </div>
  );
}
