"use client";

import Link from "next/link";
import { ArrowRight, Construction } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { REVENUE_NAV_ITEMS } from "@/lib/revenueOpportunities/nav";
import { REVENUE_OPPORTUNITIES_PHASE } from "@/lib/revenueOpportunities/featureFlag";

export default function RevenueCommandCenterPage() {
  return (
    <>
      <PageHeader
        title="Revenue command center"
        subtitle="Prospect, qualify, outreach, and convert opportunities into ShootSpine projects. Phase 1 foundation — dashboards populate in Phase 2."
      />

      <Card className="mb-6 border-sky-200 bg-sky-50/50">
        <CardBody className="flex gap-3">
          <Construction className="h-5 w-5 shrink-0 text-sky-700" />
          <div className="text-sm text-slate-700">
            <p className="font-medium text-slate-900">Implementation phase {REVENUE_OPPORTUNITIES_PHASE}</p>
            <p className="mt-1">
              Navigation and architecture are in place. Campaigns, opportunities, agents, Gmail, and n8n arrive in
              later phases. See{" "}
              <code className="text-xs">docs/revenue-opportunities-implementation-plan.md</code>.
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REVENUE_NAV_ITEMS.filter((item) => item.href !== "/revenue").map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition hover:border-sky-300">
                <CardBody>
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="h-5 w-5 text-sky-600" />
                    <h3 className="font-semibold text-slate-900">{item.label}</h3>
                  </div>
                  <p className="text-sm text-slate-600">{item.description}</p>
                  <span className="mt-3 inline-flex items-center text-xs font-medium text-sky-700">
                    Open <ArrowRight className="ml-1 h-3 w-3" />
                  </span>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
