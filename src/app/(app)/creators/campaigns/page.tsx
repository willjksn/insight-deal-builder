"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { NumberInput } from "@/components/ui/NumberInput";
import { useAuth } from "@/contexts/AuthContext";
import { canManageCreators } from "@/lib/utils/permissions";
import {
  createCreatorCampaign,
  getCreatorCampaign,
  listCreatorCampaigns,
  patchCreatorCampaign,
} from "@/lib/creators/apiClient";
import {
  CREATOR_CAMPAIGN_STATUS_LABELS,
  CREATOR_DELIVERABLE_STATUS_LABELS,
  type CreatorCampaign,
  type CreatorCampaignStatus,
  type CreatorDeliverableStatus,
} from "@/lib/creators/opsTypes";

const STATUS_OPTIONS = (Object.keys(CREATOR_CAMPAIGN_STATUS_LABELS) as CreatorCampaignStatus[]).map(
  (value) => ({ value, label: CREATOR_CAMPAIGN_STATUS_LABELS[value] })
);

export default function CreatorCampaignsPage() {
  const { user, appUser } = useAuth();
  const canManage = canManageCreators(appUser);
  const [campaigns, setCampaigns] = useState<CreatorCampaign[]>([]);
  const [active, setActive] = useState<CreatorCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [objective, setObjective] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Economics form
  const [revenue, setRevenue] = useState<number | undefined>(undefined);
  const [comp, setComp] = useState<number | undefined>(undefined);
  const [costs, setCosts] = useState<number | undefined>(undefined);

  // Brief / deliverable quick add
  const [briefCreator, setBriefCreator] = useState("");
  const [briefRole, setBriefRole] = useState("");
  const [delType, setDelType] = useState("Instagram Reel");
  const [projectId, setProjectId] = useState("");

  const getToken = useCallback(() => {
    if (!user) throw new Error("Not signed in");
    return user.getIdToken();
  }, [user]);

  const reload = useCallback(async () => {
    if (!user) return;
    const res = await listCreatorCampaigns(getToken);
    setCampaigns(res.campaigns);
  }, [user, getToken]);

  useEffect(() => {
    if (!user || !canManage) return;
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [user, canManage, reload]);

  const open = async (id: string) => {
    const res = await getCreatorCampaign(getToken, id);
    setActive(res.campaign);
    setRevenue(res.campaign.economics?.clientRevenue);
    setComp(res.campaign.economics?.creatorCompensationTotal);
    setCosts(res.campaign.economics?.directCosts);
    setProjectId(res.campaign.projectId ?? "");
  };

  if (!canManage) return <div className="p-6 text-sm">Not authorized.</div>;

  return (
    <div>
      <PageHeader
        title="Creator campaigns"
        subtitle="Assignments, briefs, deliverables, economics, and rights"
        action={
          <div className="flex gap-2">
            <Link href="/creators/shortlists">
              <Button size="touch" variant="outline">
                Shortlists
              </Button>
            </Link>
            <Link href="/creators/production-days">
              <Button size="touch" variant="outline">
                Production days
              </Button>
            </Link>
          </div>
        }
      />
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Campaigns</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} touch />
            <Input label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} touch />
            <Textarea
              label="Objective"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              touch
            />
            <Button
              size="touch"
              disabled={busy || !name.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await createCreatorCampaign(getToken, {
                    name: name.trim(),
                    brandName: brand.trim() || undefined,
                    objective: objective.trim() || undefined,
                  });
                  setName("");
                  setBrand("");
                  setObjective("");
                  await reload();
                  setActive(res.campaign);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Create campaign
            </Button>
            {loading ? (
              <LoadingSpinner />
            ) : (
              <ul className="space-y-1">
                {campaigns.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                        active?.id === c.id ? "bg-sky-50 font-semibold" : "hover:bg-slate-50"
                      }`}
                      onClick={() => open(c.id)}
                    >
                      {c.name}
                      <div className="text-xs text-slate-500">
                        {CREATOR_CAMPAIGN_STATUS_LABELS[c.status]}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {!active ? (
          <EmptyState title="Select a campaign" description="Create one to manage briefs and economics." />
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{active.name}</h2>
                  {active.brandName && (
                    <p className="text-sm text-slate-500">{active.brandName}</p>
                  )}
                </div>
                <Select
                  label="Status"
                  value={active.status}
                  options={STATUS_OPTIONS}
                  onChange={async (e) => {
                    const res = await patchCreatorCampaign(getToken, active.id, {
                      status: e.target.value as CreatorCampaignStatus,
                    });
                    setActive(res.campaign);
                    await reload();
                  }}
                />
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <NumberInput
                    label="Client revenue"
                    value={revenue}
                    onChange={setRevenue}
                    touch
                  />
                  <NumberInput
                    label="Creator compensation"
                    value={comp}
                    onChange={setComp}
                    touch
                  />
                  <NumberInput label="Direct costs" value={costs} onChange={setCosts} touch />
                </div>
                <Button
                  size="touch"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const res = await patchCreatorCampaign(getToken, active.id, {
                        economics: {
                          clientRevenue: revenue,
                          creatorCompensationTotal: comp,
                          directCosts: costs,
                        },
                      });
                      setActive(res.campaign);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Save economics
                </Button>
                {active.economics?.estimatedMargin != null && (
                  <p className="text-sm">
                    Estimated IMG margin:{" "}
                    <strong>
                      ${active.economics.estimatedMargin.toLocaleString()}
                    </strong>
                  </p>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <Textarea
                    label="Usage / rights summary"
                    value={active.rights?.usageSummary ?? ""}
                    onChange={async (e) => {
                      /* local only until save */
                      setActive({
                        ...active,
                        rights: { ...active.rights, usageSummary: e.target.value },
                      });
                    }}
                    touch
                  />
                  <Input
                    label="Exclusivity category"
                    value={active.rights?.exclusivityCategory ?? ""}
                    onChange={(e) =>
                      setActive({
                        ...active,
                        rights: { ...active.rights, exclusivityCategory: e.target.value },
                      })
                    }
                    touch
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const res = await patchCreatorCampaign(getToken, active.id, {
                      rights: active.rights,
                    });
                    setActive(res.campaign);
                  }}
                >
                  Save rights
                </Button>

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Input
                    label="Link production project ID"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  />
                  <Button
                    size="touch"
                    className="self-end"
                    variant="outline"
                    disabled={!projectId.trim()}
                    onClick={async () => {
                      const res = await patchCreatorCampaign(getToken, active.id, {
                        action: "linkProject",
                        projectId: projectId.trim(),
                      });
                      setActive(res.campaign);
                    }}
                  >
                    Convert / link to production
                  </Button>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold">Creator briefs</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                {(active.briefs ?? []).map((b) => (
                  <div key={b.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <div className="font-semibold">
                      {b.creatorName} — {b.creatorRole || "Role TBD"}
                    </div>
                    <p className="text-slate-600">{b.contentConcept || b.keyMessage || "—"}</p>
                    <Badge>{b.status ?? "draft"}</Badge>
                  </div>
                ))}
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    label="Creator name"
                    value={briefCreator}
                    onChange={(e) => setBriefCreator(e.target.value)}
                  />
                  <Input
                    label="Role"
                    value={briefRole}
                    onChange={(e) => setBriefRole(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={!briefCreator.trim()}
                  onClick={async () => {
                    const res = await patchCreatorCampaign(getToken, active.id, {
                      action: "upsertBrief",
                      brief: {
                        creatorId: "manual",
                        creatorName: briefCreator.trim(),
                        creatorRole: briefRole.trim() || undefined,
                        campaignObjective: active.objective,
                        status: "draft",
                      },
                    });
                    setActive(res.campaign);
                    setBriefCreator("");
                    setBriefRole("");
                  }}
                >
                  Add brief
                </Button>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold">Deliverables</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                {(active.deliverables ?? []).map((d) => (
                  <div
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="font-semibold">
                        {d.type} — {d.creatorName}
                      </div>
                      <Badge>
                        {CREATOR_DELIVERABLE_STATUS_LABELS[d.status as CreatorDeliverableStatus] ??
                          d.status}
                      </Badge>
                    </div>
                    <Select
                      value={d.status}
                      options={(
                        Object.keys(CREATOR_DELIVERABLE_STATUS_LABELS) as CreatorDeliverableStatus[]
                      ).map((value) => ({
                        value,
                        label: CREATOR_DELIVERABLE_STATUS_LABELS[value],
                      }))}
                      onChange={async (e) => {
                        const res = await patchCreatorCampaign(getToken, active.id, {
                          action: "upsertDeliverable",
                          deliverable: {
                            ...d,
                            status: e.target.value as CreatorDeliverableStatus,
                          },
                        });
                        setActive(res.campaign);
                      }}
                    />
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Input
                    label="Deliverable type"
                    value={delType}
                    onChange={(e) => setDelType(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="self-end"
                    onClick={async () => {
                      const res = await patchCreatorCampaign(getToken, active.id, {
                        action: "upsertDeliverable",
                        deliverable: {
                          creatorId: "manual",
                          creatorName: briefCreator.trim() || "TBD",
                          type: delType,
                          status: "planned",
                        },
                      });
                      setActive(res.campaign);
                    }}
                  >
                    Add deliverable
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
