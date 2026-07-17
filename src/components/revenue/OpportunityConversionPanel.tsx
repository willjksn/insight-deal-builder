"use client";

import Link from "next/link";
import { useState } from "react";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueOpportunityProposal } from "@/lib/revenueOpportunities/types/proposal";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export function OpportunityConversionPanel({
  opportunity,
  latestProposal,
  canManage,
  busy,
  onConvert,
}: {
  opportunity: RevenueOpportunity;
  latestProposal?: RevenueOpportunityProposal;
  canManage: boolean;
  busy?: boolean;
  onConvert: (projectName?: string) => Promise<{ projectId: string; alreadyConverted: boolean }>;
}) {
  const converted = opportunity.projectConversion?.status === "converted";
  const projectId = opportunity.projectConversion?.shootSpineProjectId;
  const [projectName, setProjectName] = useState(
    latestProposal?.title ?? opportunity.subject.name
  );
  const [message, setMessage] = useState<string | null>(null);

  if (!canManage && !converted) return null;

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900">ShootSpine project</h3>
        <p className="text-xs text-slate-500">
          Convert this opportunity into a production project with bidirectional links.
        </p>
      </CardHeader>
      <CardBody className="space-y-4 text-sm">
        {converted && projectId ? (
          <div className="space-y-3">
            <Badge variant="success">Converted</Badge>
            <Link href={`/projects/${projectId}`} className="block font-medium text-sky-700 hover:underline">
              Open project →
            </Link>
            {latestProposal?.agreementPrefill && !latestProposal.agreementId && (
              <Link
                href={`/agreements/new?revenueProposalId=${encodeURIComponent(latestProposal.id)}&projectId=${encodeURIComponent(projectId)}`}
              >
                <Button size="sm" variant="outline">
                  Create agreement from proposal
                </Button>
              </Link>
            )}
            {latestProposal?.agreementId && (
              <Link href={`/agreements/${latestProposal.agreementId}`} className="text-sky-700 hover:underline">
                View linked agreement →
              </Link>
            )}
          </div>
        ) : (
          <>
            {opportunity.projectConversion?.status === "failed" && (
              <p className="text-red-600">
                Last conversion failed: {opportunity.projectConversion.lastError ?? "Unknown error"}
              </p>
            )}
            <Input
              label="Project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
            <Button
              size="touch"
              disabled={busy || !projectName.trim()}
              onClick={async () => {
                setMessage(null);
                const res = await onConvert(projectName.trim());
                setMessage(res.alreadyConverted ? "Project already linked" : "Project created");
              }}
            >
              Create ShootSpine project
            </Button>
            {message && <p className="text-xs text-emerald-700">{message}</p>}
          </>
        )}
      </CardBody>
    </Card>
  );
}
