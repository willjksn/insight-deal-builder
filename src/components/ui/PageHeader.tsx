import { ReactNode } from "react";
import Link from "next/link";
import { Button } from "./Button";

export function PageHeader({
  title,
  subtitle,
  action,
  actionLabel,
  actionHref,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-2 h-1 w-10 rounded-full bg-gradient-to-r from-sky-400 to-blue-500" />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
            {subtitle}
          </p>
        )}
      </div>
      {action ||
        (actionLabel && actionHref && (
          <Link href={actionHref}>
            <Button size="touch" className="w-full sm:w-auto">
              {actionLabel}
            </Button>
          </Link>
        ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-200/60 bg-sky-50/30 py-16 px-6 text-center">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-600">{description}</p>
      {actionLabel && onAction && (
        <Button size="touch" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {actionLabel && actionHref && !onAction && (
        <Link href={actionHref} className="mt-6">
          <Button size="touch">{actionLabel}</Button>
        </Link>
      )}
    </div>
  );
}
