"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { listCreatorPortalCampaigns } from "@/lib/creators/apiClient";
import type { CreatorProductionDay } from "@/lib/creators/opsTypes";

type PortalCampaign = Awaited<
  ReturnType<typeof listCreatorPortalCampaigns>
>["campaigns"][number];

export default function CreatorPortalCampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<PortalCampaign[]>([]);
  const [days, setDays] = useState<CreatorProductionDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await listCreatorPortalCampaigns(getToken);
        if (cancelled) return;
        setCampaigns(data.campaigns);
        setDays(data.productionDays);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load campaigns");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getToken]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/creator-portal"
          className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to portal
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">My campaigns</h1>
        <p className="mt-1 text-sm text-slate-600">
          Assignments, briefs, and deliverables IMG has shared with you.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {campaigns.length === 0 ? (
        <Card>
          <CardBody className="text-sm text-slate-600">
            You don&apos;t have any campaign assignments yet. IMG will add you when a brand
            collaboration is ready.
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => (
            <Card key={c.id}>
              <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{c.name}</h2>
                  {c.brandName && (
                    <p className="text-sm text-slate-500">{c.brandName}</p>
                  )}
                </div>
                <Badge>{c.status}</Badge>
              </CardHeader>
              <CardBody className="space-y-3 text-sm text-slate-700">
                {c.objective && <p>{c.objective}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                  {c.role && <span>Role: {c.role}</span>}
                  {typeof c.compensation === "number" && (
                    <span>Compensation: ${c.compensation.toLocaleString()}</span>
                  )}
                  {c.compensationNotes && <span>{c.compensationNotes}</span>}
                </div>
                {c.briefs.length > 0 && (
                  <div>
                    <p className="mb-1 font-medium text-slate-900">Briefs</p>
                    <ul className="list-inside list-disc space-y-1 text-slate-600">
                      {c.briefs.map((b) => (
                        <li key={b.id}>
                          {b.contentConcept || b.campaignObjective || "Brief"}
                          {b.postingDate ? ` · post ${b.postingDate}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {c.deliverables.length > 0 && (
                  <div>
                    <p className="mb-1 font-medium text-slate-900">Deliverables</p>
                    <ul className="list-inside list-disc space-y-1 text-slate-600">
                      {c.deliverables.map((d) => (
                        <li key={d.id}>
                          {d.type || d.platform || "Deliverable"}
                          {d.status ? ` · ${d.status}` : ""}
                          {d.dueDate ? ` · due ${d.dueDate}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {days.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Production days</h2>
          {days.map((day) => (
            <Card key={day.id}>
              <CardBody className="text-sm text-slate-700">
                <p className="font-medium text-slate-900">
                  {day.name} · {day.date}
                </p>
                {day.location && <p className="text-slate-600">{day.location}</p>}
                {day.notes && <p className="mt-1 text-slate-600">{day.notes}</p>}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
