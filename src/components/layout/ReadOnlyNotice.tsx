"use client";

import { useAuth } from "@/contexts/AuthContext";
import { hasAnyWritePermission } from "@/lib/utils/permissions";

export function ReadOnlyNotice() {
  const { appUser } = useAuth();
  if (hasAnyWritePermission(appUser)) return null;

  return (
    <div className="mb-6 rounded-xl border border-sky-200/80 bg-gradient-to-r from-sky-50 to-blue-50 px-4 py-3 text-sm text-sky-950 shadow-sm">
      You have <strong>limited access</strong>. You can view deals you are a party on.
      Ask an Insight Media Group admin to grant permissions from the Admin tab.
    </div>
  );
}
