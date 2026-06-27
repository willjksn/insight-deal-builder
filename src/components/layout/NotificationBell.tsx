"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDate } from "@/lib/utils/format";

export function NotificationBell() {
  const { appUser } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(
    appUser?.id,
    appUser?.company
  );
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (!appUser) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-xs font-medium text-sky-600 hover:text-sky-800"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet</li>
            ) : (
              notifications.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/agreements/${n.agreementId}`}
                    onClick={() => {
                      if (!n.read) markRead(n.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "block border-b border-slate-50 px-4 py-3 transition-colors hover:bg-slate-50",
                      !n.read && "bg-sky-50/60"
                    )}
                  >
                    <p className="text-sm font-medium text-slate-900">Client signed agreement</p>
                    <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">
                      {n.signerName} signed{n.projectName ? ` — ${n.projectName}` : ""}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {n.createdAt?.toDate ? formatDate(n.createdAt.toDate().toISOString()) : ""}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
