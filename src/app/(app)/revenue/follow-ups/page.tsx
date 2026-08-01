"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { FollowUpTasksPanel } from "@/components/revenue/FollowUpTasksPanel";
import { PageHeader } from "@/components/ui/PageHeader";

export default function RevenueFollowUpsPage() {
  const { user, appUser } = useAuth();
  const canManage = canManageRevenueOpportunities(appUser);

  return (
    <>
      <Link href="/revenue" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Command center
      </Link>
      <PageHeader
        title="Follow-up tasks"
        subtitle="Open outreach reminders across opportunities — complete or snooze as you work the pipeline."
      />
      {user ? (
        <FollowUpTasksPanel getToken={() => user.getIdToken()} canManage={canManage} />
      ) : null}
    </>
  );
}
