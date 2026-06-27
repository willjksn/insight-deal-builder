"use client";

import { cn } from "@/lib/utils/cn";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

export function DataTable({
  headers,
  children,
  emptyMessage,
}: {
  headers: string[];
  children: ReactNode;
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/90 shadow-md shadow-slate-200/40">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {!children && emptyMessage && (
        <p className="px-4 py-8 text-center text-slate-500">{emptyMessage}</p>
      )}
    </div>
  );
}

export function DataRow({
  cells,
  href,
  onClick,
  actionCellIndex,
}: {
  cells: ReactNode[];
  href?: string;
  onClick?: () => void;
  /** Index of actions column — clicks here do not trigger row navigation */
  actionCellIndex?: number;
}) {
  const router = useRouter();
  const navigable = Boolean(href || onClick);
  const rowClass = cn(
    "hover:bg-sky-50/40 transition-colors",
    navigable && "cursor-pointer"
  );

  const handleRowClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (href) router.push(href);
  };

  return (
    <tr className={rowClass} onClick={navigable ? handleRowClick : undefined}>
      {cells.map((cell, i) => (
        <td
          key={i}
          className={cn(
            "px-4 py-3.5 text-slate-700",
            i === 0 && "font-medium text-slate-900"
          )}
          onClick={i === actionCellIndex ? (e) => e.stopPropagation() : undefined}
        >
          {cell}
        </td>
      ))}
    </tr>
  );
}
