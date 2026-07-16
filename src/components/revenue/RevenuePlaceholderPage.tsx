"use client";

import { Construction } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { REVENUE_OPPORTUNITIES_PHASE } from "@/lib/revenueOpportunities/featureFlag";

export function RevenuePlaceholderPage({
  title,
  subtitle,
  phaseNote,
}: {
  title: string;
  subtitle: string;
  phaseNote?: string;
}) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <CardBody className="flex gap-3">
          <Construction className="h-5 w-5 shrink-0 text-slate-500" />
          <div className="text-sm text-slate-600">
            <p>
              This screen is part of the Revenue & opportunities foundation (phase {REVENUE_OPPORTUNITIES_PHASE}).
              {phaseNote ? ` ${phaseNote}` : " Functionality arrives in a later implementation phase."}
            </p>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
