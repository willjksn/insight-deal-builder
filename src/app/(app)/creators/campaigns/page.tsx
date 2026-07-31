"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { NumberInput } from "@/components/ui/NumberInput";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { canManageCreators } from "@/lib/utils/permissions";
import {
  createCreatorCampaign,
  getCreatorCampaign,
  listCreatorCampaigns,
  listCreators,
  patchCreatorCampaign,
} from "@/lib/creators/apiClient";
import {
  formatCreatorAssignGapWarning,
  getCreatorCampaignAssignGaps,
} from "@/lib/creators/onboardingGate";
import {
  CREATOR_CAMPAIGN_STATUS_LABELS,
  CREATOR_DELIVERABLE_STATUS_LABELS,
  type CreatorCampaign,
  type CreatorCampaignAssignment,
  type CreatorCampaignStatus,
  type CreatorDeliverableStatus,
} from "@/lib/creators/opsTypes";
import { isStripeConnectReady, type Creator } from "@/lib/creators/types";
import { formatDate } from "@/lib/utils/format";

const STATUS_OPTIONS = (Object.keys(CREATOR_CAMPAIGN_STATUS_LABELS) as CreatorCampaignStatus[]).map(
  (value) => ({ value, label: CREATOR_CAMPAIGN_STATUS_LABELS[value] })
);

export default function CreatorCampaignsPage() {
  const { user, appUser } = useAuth();
  const searchParams = useSearchParams();
  const openId = searchParams.get("open");
  const canManage = canManageCreators(appUser);
  const [campaigns, setCampaigns] = useState<CreatorCampaign[]>([]);
  const [roster, setRoster] = useState<Creator[]>([]);
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

  // Assignment form
  const [assignCreatorId, setAssignCreatorId] = useState("");
  const [assignRole, setAssignRole] = useState("");
  const [assignComp, setAssignComp] = useState<number | undefined>(undefined);
  const [assignWarnOpen, setAssignWarnOpen] = useState(false);
  const [assignWarnText, setAssignWarnText] = useState("");
  const [payTarget, setPayTarget] = useState<{
    assignment: CreatorCampaignAssignment;
    mode: "stripe" | "manual" | "clear";
  } | null>(null);

  // Brief / deliverable quick add (tied to assigned creators)
  const [briefCreatorId, setBriefCreatorId] = useState("");
  const [briefRole, setBriefRole] = useState("");
  const [delType, setDelType] = useState("Instagram Reel");
  const [delCreatorId, setDelCreatorId] = useState("");
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
    Promise.all([reload(), listCreators(getToken)])
      .then(([, creators]) => setRoster(creators))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [user, canManage, reload, getToken]);

  const open = useCallback(async (id: string) => {
    setError(null);
    const res = await getCreatorCampaign(getToken, id);
    setActive(res.campaign);
    setRevenue(res.campaign.economics?.clientRevenue);
    setComp(res.campaign.economics?.creatorCompensationTotal);
    setCosts(res.campaign.economics?.directCosts);
    setProjectId(res.campaign.projectId ?? "");
    setAssignCreatorId("");
    setAssignRole("");
    setAssignComp(undefined);
    const firstAssigned = res.campaign.assignments?.[0]?.creatorId ?? "";
    setBriefCreatorId(firstAssigned);
    setDelCreatorId(firstAssigned);
    setBriefRole(res.campaign.assignments?.[0]?.role ?? "");
  }, [getToken]);

  useEffect(() => {
    if (!openId || !user || !canManage || loading) return;
    if (active?.id === openId) return;
    void open(openId).catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to open campaign")
    );
  }, [openId, user, canManage, loading, active?.id, open]);

  const assignableRoster = useMemo(() => {
    const assigned = new Set((active?.assignments ?? []).map((a) => a.creatorId));
    return roster
      .filter((c) => c.relationshipType !== "applicant")
      .filter((c) => !assigned.has(c.id))
      .slice()
      .sort((a, b) => a.professionalName.localeCompare(b.professionalName));
  }, [roster, active?.assignments]);

  const assignmentOptions = useMemo(
    () =>
      (active?.assignments ?? []).map((a) => ({
        value: a.creatorId,
        label: a.creatorName + (a.role ? ` (${a.role})` : ""),
      })),
    [active?.assignments]
  );

  const rosterById = useMemo(() => new Map(roster.map((c) => [c.id, c])), [roster]);

  const runAssign = useCallback(async () => {
    if (!active || !assignCreatorId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await patchCreatorCampaign(getToken, active.id, {
        action: "addAssignment",
        assignment: {
          creatorId: assignCreatorId,
          role: assignRole.trim() || undefined,
          compensation: assignComp,
        },
      });
      setActive(res.campaign);
      await reload();
      if (!briefCreatorId) setBriefCreatorId(assignCreatorId);
      if (!delCreatorId) setDelCreatorId(assignCreatorId);
      setAssignCreatorId("");
      setAssignRole("");
      setAssignComp(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assign failed");
    } finally {
      setBusy(false);
      setAssignWarnOpen(false);
    }
  }, [
    active,
    assignCreatorId,
    assignRole,
    assignComp,
    getToken,
    reload,
    briefCreatorId,
    delCreatorId,
  ]);

  const requestAssign = () => {
    if (!assignCreatorId) return;
    const creator = rosterById.get(assignCreatorId);
    const gaps = creator ? getCreatorCampaignAssignGaps(creator) : [];
    if (gaps.length && creator) {
      setAssignWarnText(formatCreatorAssignGapWarning(creator.professionalName, gaps));
      setAssignWarnOpen(true);
      return;
    }
    void runAssign();
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
                setError(null);
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
                  await open(res.campaign.id);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Create failed");
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
                        {(c.assignments?.length ?? 0) > 0
                          ? ` · ${c.assignments!.length} assigned`
                          : ""}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {!active ? (
          <EmptyState
            title="Select a campaign"
            description="Create one, then assign roster creators so they can see it in the portal."
          />
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
                    <strong>${active.economics.estimatedMargin.toLocaleString()}</strong>
                  </p>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <Textarea
                    label="Usage / rights summary"
                    value={active.rights?.usageSummary ?? ""}
                    onChange={(e) => {
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
                <h2 className="font-semibold">Assigned creators</h2>
                <p className="text-xs font-normal text-slate-500">
                  Assigned creators see this campaign in their ShootSpine portal.
                </p>
              </CardHeader>
              <CardBody className="space-y-3">
                {(active.assignments ?? []).length === 0 ? (
                  <p className="text-sm text-slate-600">
                    No creators assigned yet. Pick someone from the roster below.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {(active.assignments ?? []).map((a) => {
                      const creator = rosterById.get(a.creatorId);
                      const gaps = creator ? getCreatorCampaignAssignGaps(creator) : [];
                      const connectReady = isStripeConnectReady(creator);
                      const alreadyPaid = Boolean(a.paidAt || a.stripeTransferId);
                      const hasComp =
                        typeof a.compensation === "number" && a.compensation > 0;
                      const canPayStripe = !alreadyPaid && hasComp && connectReady;
                      const canMarkPaid = !alreadyPaid && hasComp;
                      const canClearPaid =
                        alreadyPaid &&
                        a.paidVia === "manual" &&
                        !a.stripeTransferId;
                      return (
                      <li
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/creators/${a.creatorId}`}
                              className="font-semibold text-sky-800 hover:underline"
                            >
                              {a.creatorName}
                            </Link>
                            {alreadyPaid ? (
                              <Badge variant="success">Paid</Badge>
                            ) : gaps.length > 0 ? (
                              <Badge variant="warning">Onboarding incomplete</Badge>
                            ) : null}
                          </div>
                          <div className="text-xs text-slate-500">
                            {a.role || "Role TBD"}
                            {typeof a.compensation === "number"
                              ? ` · $${a.compensation.toLocaleString()}`
                              : ""}
                            {a.status ? ` · ${a.status}` : ""}
                            {alreadyPaid && a.paidAt
                              ? ` · Paid ${formatDate(a.paidAt)}${
                                  typeof a.paidAmount === "number"
                                    ? ` · $${a.paidAmount.toLocaleString()}`
                                    : ""
                                }${
                                  a.paidVia === "stripe"
                                    ? " · Stripe"
                                    : a.paidVia === "manual"
                                      ? " · Manual"
                                      : a.stripeTransferId
                                        ? " · Stripe"
                                        : ""
                                }`
                              : ""}
                            {!alreadyPaid && gaps.length
                              ? ` · ${gaps.map((g) => g.label).join("; ")}`
                              : ""}
                            {!alreadyPaid && hasComp && !connectReady
                              ? " · Stripe Connect not ready"
                              : ""}
                            {a.payoutError ? (
                              <span className="mt-0.5 block text-amber-800">{a.payoutError}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          {canPayStripe ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => setPayTarget({ assignment: a, mode: "stripe" })}
                            >
                              Pay via Stripe
                            </Button>
                          ) : null}
                          {canMarkPaid ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() => setPayTarget({ assignment: a, mode: "manual" })}
                            >
                              Mark paid
                            </Button>
                          ) : null}
                          {canClearPaid ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() => setPayTarget({ assignment: a, mode: "clear" })}
                            >
                              Clear paid
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy || alreadyPaid}
                            onClick={async () => {
                              setBusy(true);
                              setError(null);
                              try {
                                const res = await patchCreatorCampaign(getToken, active.id, {
                                  action: "removeAssignment",
                                  assignmentId: a.id,
                                });
                                setActive(res.campaign);
                                await reload();
                                if (briefCreatorId === a.creatorId) {
                                  setBriefCreatorId(res.campaign.assignments?.[0]?.creatorId ?? "");
                                }
                                if (delCreatorId === a.creatorId) {
                                  setDelCreatorId(res.campaign.assignments?.[0]?.creatorId ?? "");
                                }
                              } catch (e) {
                                setError(e instanceof Error ? e.message : "Remove failed");
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </li>
                    );
                    })}
                  </ul>
                )}

                <div className="grid gap-2 border-t border-slate-100 pt-3 md:grid-cols-2">
                  <Select
                    label="Add from roster"
                    value={assignCreatorId}
                    options={[
                      { value: "", label: "Select creator…" },
                      ...assignableRoster.map((c) => {
                        const gaps = getCreatorCampaignAssignGaps(c);
                        return {
                          value: c.id,
                          label: `${c.professionalName}${c.primaryNiche ? ` · ${c.primaryNiche}` : ""}${gaps.length ? " · onboarding incomplete" : ""}`,
                        };
                      }),
                    ]}
                    onChange={(e) => setAssignCreatorId(e.target.value)}
                    touch
                  />
                  <Input
                    label="Role"
                    value={assignRole}
                    onChange={(e) => setAssignRole(e.target.value)}
                    placeholder="e.g. Lead talent"
                    touch
                  />
                  <NumberInput
                    label="Compensation (optional)"
                    value={assignComp}
                    onChange={setAssignComp}
                    touch
                  />
                  <div className="flex items-end">
                    <Button
                      size="touch"
                      className="w-full"
                      disabled={busy || !assignCreatorId}
                      onClick={requestAssign}
                    >
                      Assign creator
                    </Button>
                  </div>
                </div>
                {assignableRoster.length === 0 && (
                  <p className="text-xs text-slate-500">
                    Everyone on the roster is already assigned, or add creators under{" "}
                    <Link href="/creators" className="underline">
                      Creators
                    </Link>
                    .
                  </p>
                )}
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
                {assignmentOptions.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    Assign a creator first, then add their brief.
                  </p>
                ) : (
                  <>
                    <div className="grid gap-2 md:grid-cols-2">
                      <Select
                        label="Assigned creator"
                        value={briefCreatorId}
                        options={[
                          { value: "", label: "Select…" },
                          ...assignmentOptions,
                        ]}
                        onChange={(e) => {
                          setBriefCreatorId(e.target.value);
                          const a = (active.assignments ?? []).find(
                            (x) => x.creatorId === e.target.value
                          );
                          if (a?.role) setBriefRole(a.role);
                        }}
                        touch
                      />
                      <Input
                        label="Role"
                        value={briefRole}
                        onChange={(e) => setBriefRole(e.target.value)}
                        touch
                      />
                    </div>
                    <Button
                      size="sm"
                      disabled={!briefCreatorId}
                      onClick={async () => {
                        const a = (active.assignments ?? []).find(
                          (x) => x.creatorId === briefCreatorId
                        );
                        if (!a) return;
                        const res = await patchCreatorCampaign(getToken, active.id, {
                          action: "upsertBrief",
                          brief: {
                            creatorId: a.creatorId,
                            creatorName: a.creatorName,
                            creatorRole: briefRole.trim() || a.role || undefined,
                            campaignObjective: active.objective,
                            status: "draft",
                          },
                        });
                        setActive(res.campaign);
                        setBriefRole("");
                      }}
                    >
                      Add brief
                    </Button>
                  </>
                )}
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
                {assignmentOptions.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    Assign a creator first, then add deliverables.
                  </p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    <Select
                      label="Assigned creator"
                      value={delCreatorId}
                      options={[
                        { value: "", label: "Select…" },
                        ...assignmentOptions,
                      ]}
                      onChange={(e) => setDelCreatorId(e.target.value)}
                      touch
                    />
                    <Input
                      label="Deliverable type"
                      value={delType}
                      onChange={(e) => setDelType(e.target.value)}
                      touch
                    />
                    <Button
                      size="sm"
                      className="md:col-span-2"
                      disabled={!delCreatorId || !delType.trim()}
                      onClick={async () => {
                        const a = (active.assignments ?? []).find(
                          (x) => x.creatorId === delCreatorId
                        );
                        if (!a) return;
                        const res = await patchCreatorCampaign(getToken, active.id, {
                          action: "upsertDeliverable",
                          deliverable: {
                            creatorId: a.creatorId,
                            creatorName: a.creatorName,
                            type: delType.trim(),
                            status: "planned",
                          },
                        });
                        setActive(res.campaign);
                      }}
                    >
                      Add deliverable
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={assignWarnOpen}
        title="Assign creator with incomplete onboarding?"
        description={assignWarnText}
        confirmLabel="Assign anyway"
        cancelLabel="Cancel"
        loading={busy}
        onCancel={() => setAssignWarnOpen(false)}
        onConfirm={() => void runAssign()}
      />

      <ConfirmDialog
        open={Boolean(payTarget)}
        title={
          payTarget?.mode === "clear"
            ? "Clear paid record?"
            : payTarget?.mode === "manual"
              ? "Mark assignment paid?"
              : "Pay creator via Stripe?"
        }
        description={
          payTarget
            ? payTarget.mode === "clear"
              ? `Remove the paid mark for ${payTarget.assignment.creatorName}. This does not reverse any money already sent outside ShootSpine.`
              : payTarget.mode === "manual"
                ? `Record $${(payTarget.assignment.compensation ?? 0).toLocaleString()} as paid to ${payTarget.assignment.creatorName} outside Stripe (PayPal, ACH, Venmo, check, etc.). No money will move from ShootSpine.`
                : `Transfer $${(payTarget.assignment.compensation ?? 0).toLocaleString()} USD to ${payTarget.assignment.creatorName} through their Stripe Connect Express account. This uses your platform Stripe balance.`
            : ""
        }
        confirmLabel={
          payTarget?.mode === "clear"
            ? "Clear paid"
            : payTarget?.mode === "manual"
              ? "Mark paid"
              : "Pay via Stripe"
        }
        cancelLabel="Cancel"
        loading={busy}
        onCancel={() => setPayTarget(null)}
        onConfirm={() => {
          void (async () => {
            if (!active || !payTarget) return;
            setBusy(true);
            setError(null);
            try {
              const action =
                payTarget.mode === "clear"
                  ? "clearAssignmentPaid"
                  : payTarget.mode === "manual"
                    ? "markAssignmentPaid"
                    : "payAssignmentStripe";
              const res = await patchCreatorCampaign(getToken, active.id, {
                action,
                assignmentId: payTarget.assignment.id,
              });
              setActive(res.campaign);
              setPayTarget(null);
              await reload();
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : payTarget.mode === "clear"
                    ? "Could not clear paid"
                    : payTarget.mode === "manual"
                      ? "Could not mark paid"
                      : "Stripe payout failed"
              );
            } finally {
              setBusy(false);
            }
          })();
        }}
      />
    </div>
  );
}
