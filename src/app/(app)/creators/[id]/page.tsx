"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  canManageCreators,
  canViewSensitiveCreatorDocs,
} from "@/lib/utils/permissions";
import {
  addCreatorDocument,
  deleteCreator,
  getCreator,
  getCreatorDocumentViewUrl,
  removeCreatorDocument,
  saveDevelopmentPlan,
  sendCreatorPortalInvite,
  setCreatorApplicationStatus,
  updateCreator,
  voidCreatorNetworkAgreement,
  reviewCreatorIdentityVerification,
  viewCreatorIdentityDocument,
  syncCreatorStripeConnect,
  remindCreatorStripeConnect,
} from "@/lib/creators/apiClient";
import {
  CREATOR_READINESS_LABELS,
  CREATOR_RELATIONSHIP_LABELS,
  CREATOR_STATUS_LABELS,
  type Creator,
  type CreatorAvailability,
  type CreatorDocumentKind,
  type CreatorOnboardingTask,
  type CreatorPlatform,
  type CreatorRate,
  type CreatorReadiness,
  type CreatorReadinessStatus,
  type CreatorRelationshipType,
  type CreatorStatus,
  type CreatorUpdateInput,
} from "@/lib/creators/types";
import type { CreatorDevelopmentPlan } from "@/lib/creators/opsTypes";
import { CreatorPlatformsPanel } from "@/components/creators/CreatorPlatformsPanel";
import { CreatorRatesPanel } from "@/components/creators/CreatorRatesPanel";
import { CreatorAvailabilityPanel } from "@/components/creators/CreatorAvailabilityPanel";
import { CreatorReadinessPanel } from "@/components/creators/CreatorReadinessPanel";
import { CreatorOnboardingPanel } from "@/components/creators/CreatorOnboardingPanel";
import { CreatorNetworkAgreementPanel } from "@/components/creators/CreatorNetworkAgreementPanel";
import { CreatorIdentityVerificationPanel } from "@/components/creators/CreatorIdentityVerificationPanel";
import { CreatorStripeConnectPanel } from "@/components/creators/CreatorStripeConnectPanel";
import { CreatorChangeHistoryPanel } from "@/components/creators/CreatorChangeHistoryPanel";
import { CreatorDocumentsPanel } from "@/components/creators/CreatorDocumentsPanel";
import { CreatorApplicationPanel } from "@/components/creators/CreatorApplicationPanel";
import { CreatorPortalInviteCard } from "@/components/creators/CreatorPortalInviteCard";
import { CreatorDevelopmentPanel } from "@/components/creators/CreatorDevelopmentPanel";

const RELATIONSHIP_OPTIONS = (
  Object.keys(CREATOR_RELATIONSHIP_LABELS) as CreatorRelationshipType[]
).map((value) => ({ value, label: CREATOR_RELATIONSHIP_LABELS[value] }));
const STATUS_OPTIONS = (Object.keys(CREATOR_STATUS_LABELS) as CreatorStatus[]).map((value) => ({
  value,
  label: CREATOR_STATUS_LABELS[value],
}));

const listToText = (arr?: string[]) => (arr ?? []).join(", ");
const textToList = (text: string) =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export default function CreatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, appUser } = useAuth();
  const canManage = canManageCreators(appUser);
  const canViewSensitive = canViewSensitiveCreatorDocs(appUser);

  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState({
    professionalName: "",
    legalName: "",
    relationshipType: "network" as CreatorRelationshipType,
    status: "active" as CreatorStatus,
    primaryNiche: "",
    secondaryNiches: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    portfolioUrl: "",
    description: "",
    audienceDescription: "",
    brandPositioning: "",
    tags: "",
    notes: "",
  });

  const getToken = useCallback(() => {
    if (!user) throw new Error("Not signed in");
    return user.getIdToken();
  }, [user]);

  const hydrate = useCallback((c: Creator) => {
    setCreator(c);
    setForm({
      professionalName: c.professionalName ?? "",
      legalName: c.legalName ?? "",
      relationshipType: c.relationshipType ?? "network",
      status: c.status ?? "active",
      primaryNiche: c.primaryNiche ?? "",
      secondaryNiches: listToText(c.secondaryNiches),
      email: c.email ?? "",
      phone: c.phone ?? "",
      location: c.location ?? "",
      website: c.website ?? "",
      portfolioUrl: c.portfolioUrl ?? "",
      description: c.description ?? "",
      audienceDescription: c.audienceDescription ?? "",
      brandPositioning: c.brandPositioning ?? "",
      tags: listToText(c.tags),
      notes: c.notes ?? "",
    });
  }, []);

  const reload = useCallback(async () => {
    if (!user || !id) return;
    const c = await getCreator(getToken, id);
    hydrate(c);
  }, [user, id, getToken, hydrate]);

  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load creator"))
      .finally(() => setLoading(false));
  }, [user, id, reload]);

  const patch = async (payload: CreatorUpdateInput) => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateCreator(getToken, id, payload);
      hydrate(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    await patch({
      professionalName: form.professionalName.trim(),
      legalName: form.legalName.trim(),
      relationshipType: form.relationshipType,
      status: form.status,
      primaryNiche: form.primaryNiche.trim(),
      secondaryNiches: textToList(form.secondaryNiches),
      email: form.email.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      website: form.website.trim(),
      portfolioUrl: form.portfolioUrl.trim(),
      description: form.description.trim(),
      audienceDescription: form.audienceDescription.trim(),
      brandPositioning: form.brandPositioning.trim(),
      tags: textToList(form.tags),
      notes: form.notes.trim(),
    });
  };

  if (loading) return <LoadingSpinner className="py-20" />;
  if (!creator) {
    return (
      <div>
        <Link
          href="/creators"
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to creators
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error ?? "Creator not found."}
        </div>
      </div>
    );
  }

  const readOnly = !canManage;

  return (
    <div>
      <Link
        href="/creators"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to creators
      </Link>

      <PageHeader
        title={creator.professionalName}
        subtitle={CREATOR_RELATIONSHIP_LABELS[creator.relationshipType]}
        action={
          canManage ? (
            <Button variant="ghost" size="touch" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="default">{CREATOR_RELATIONSHIP_LABELS[creator.relationshipType]}</Badge>
        <Badge variant="info">{CREATOR_READINESS_LABELS[creator.readinessStatus]}</Badge>
        <Badge variant={creator.status === "active" ? "success" : "default"}>
          {CREATOR_STATUS_LABELS[creator.status]}
        </Badge>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {creator.businessProfileId && (
        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Linked to a business profile.{" "}
          <Link href="/revenue" className="font-semibold underline">
            Open Revenue &amp; opportunities
          </Link>{" "}
          to manage the campaign track.
        </div>
      )}

      <div className="space-y-6">
        <CreatorApplicationPanel
          creator={creator}
          canEdit={canManage}
          saving={saving}
          onSetStatus={async (payload) => {
            if (!id) return;
            setSaving(true);
            setError(null);
            try {
              const updated = await setCreatorApplicationStatus(getToken, id, payload);
              hydrate(updated);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to update application");
            } finally {
              setSaving(false);
            }
          }}
        />

        <CreatorPortalInviteCard
          creator={creator}
          canEdit={canManage}
          onSendInvite={async () => {
            if (!id) throw new Error("Missing creator id");
            return sendCreatorPortalInvite(getToken, id);
          }}
          onCreatorRefresh={(patch) => setCreator((prev) => (prev ? { ...prev, ...patch } : prev))}
        />

        <form onSubmit={handleSaveIdentity} className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Identity</h2>
            </CardHeader>
            <CardBody>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Professional name"
                  value={form.professionalName}
                  onChange={(e) => setForm({ ...form, professionalName: e.target.value })}
                  required
                  disabled={readOnly}
                  touch
                />
                <Input
                  label="Legal name"
                  value={form.legalName}
                  onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                  disabled={readOnly}
                  touch
                />
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={readOnly}
                  touch
                />
                <Input
                  label="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  disabled={readOnly}
                  touch
                />
                <Input
                  label="Location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  disabled={readOnly}
                  touch
                />
                <Input
                  label="Website"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  disabled={readOnly}
                  touch
                />
                <Input
                  label="Portfolio / media kit URL"
                  value={form.portfolioUrl}
                  onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
                  disabled={readOnly}
                  touch
                />
                <Select
                  label="Relationship"
                  value={form.relationshipType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      relationshipType: e.target.value as CreatorRelationshipType,
                    })
                  }
                  options={RELATIONSHIP_OPTIONS}
                  disabled={readOnly}
                  touch
                />
                <Select
                  label="Status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as CreatorStatus })}
                  options={STATUS_OPTIONS}
                  disabled={readOnly}
                  touch
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Positioning</h2>
            </CardHeader>
            <CardBody>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Primary niche"
                  value={form.primaryNiche}
                  onChange={(e) => setForm({ ...form, primaryNiche: e.target.value })}
                  disabled={readOnly}
                  touch
                />
                <Input
                  label="Secondary niches (comma-separated)"
                  value={form.secondaryNiches}
                  onChange={(e) => setForm({ ...form, secondaryNiches: e.target.value })}
                  disabled={readOnly}
                  touch
                />
                <div className="md:col-span-2">
                  <Textarea
                    label="Audience description"
                    value={form.audienceDescription}
                    onChange={(e) => setForm({ ...form, audienceDescription: e.target.value })}
                    disabled={readOnly}
                    touch
                  />
                </div>
                <div className="md:col-span-2">
                  <Textarea
                    label="Brand positioning"
                    value={form.brandPositioning}
                    onChange={(e) => setForm({ ...form, brandPositioning: e.target.value })}
                    disabled={readOnly}
                    touch
                  />
                </div>
                <div className="md:col-span-2">
                  <Textarea
                    label="Description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    disabled={readOnly}
                    touch
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    label="Tags (comma-separated)"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    disabled={readOnly}
                    touch
                  />
                </div>
                <div className="md:col-span-2">
                  <Textarea
                    label="Internal notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    disabled={readOnly}
                    touch
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {canManage && (
            <Button type="submit" size="touch" disabled={saving}>
              {saving ? "Saving…" : "Save identity & positioning"}
            </Button>
          )}
        </form>

        <CreatorPlatformsPanel
          key={`plat-${creator.updatedAt}`}
          platforms={creator.platforms ?? []}
          canEdit={canManage}
          saving={saving}
          onSave={(platforms: CreatorPlatform[]) => patch({ platforms })}
        />

        <CreatorRatesPanel
          key={`rates-${creator.updatedAt}`}
          rates={creator.rates ?? []}
          canEdit={canManage}
          saving={saving}
          onSave={(rates: CreatorRate[]) => patch({ rates })}
        />

        <CreatorAvailabilityPanel
          key={`avail-${creator.updatedAt}`}
          availability={creator.availability}
          canEdit={canManage}
          saving={saving}
          onSave={(availability: CreatorAvailability) => patch({ availability })}
        />

        <CreatorReadinessPanel
          key={`ready-${creator.updatedAt}`}
          readinessStatus={creator.readinessStatus}
          readiness={creator.readiness}
          canEdit={canManage}
          saving={saving}
          onSave={(payload: {
            readinessStatus: CreatorReadinessStatus;
            readiness: CreatorReadiness;
          }) => patch(payload)}
        />

        <CreatorNetworkAgreementPanel
          key={`msa-${creator.updatedAt}`}
          agreement={creator.networkAgreement}
          creatorDisplayName={creator.professionalName}
          canEdit={canManage}
          saving={saving}
          onVoid={async () => {
            if (!id) return;
            setSaving(true);
            try {
              const updated = await voidCreatorNetworkAgreement(getToken, id);
              hydrate(updated);
            } finally {
              setSaving(false);
            }
          }}
        />

        <CreatorIdentityVerificationPanel
          key={`idv-${creator.updatedAt}`}
          verification={creator.identityVerification}
          canEdit={canManage}
          canViewSensitive={canViewSensitive}
          saving={saving}
          onApprove={async () => {
            if (!id) return;
            setSaving(true);
            try {
              const updated = await reviewCreatorIdentityVerification(getToken, id, {
                action: "approve",
              });
              hydrate(updated);
            } finally {
              setSaving(false);
            }
          }}
          onReject={async (rejectionReason) => {
            if (!id) return;
            setSaving(true);
            try {
              const updated = await reviewCreatorIdentityVerification(getToken, id, {
                action: "reject",
                rejectionReason,
              });
              hydrate(updated);
            } finally {
              setSaving(false);
            }
          }}
          onView={async (side) => {
            if (!id) return;
            const { url } = await viewCreatorIdentityDocument(getToken, id, side);
            window.open(url, "_blank", "noopener,noreferrer");
          }}
        />

        <CreatorStripeConnectPanel
          key={`connect-${creator.updatedAt}`}
          stripeConnectAccountId={creator.stripeConnectAccountId}
          stripeConnect={creator.stripeConnect}
          canManage={canManage}
          onSync={async () => {
            if (!id) return;
            const updated = await syncCreatorStripeConnect(getToken, id);
            hydrate(updated);
          }}
          onRemind={async () => {
            if (!id) return;
            await remindCreatorStripeConnect(getToken, id);
          }}
        />

        <CreatorOnboardingPanel
          key={`onboard-${creator.updatedAt}`}
          onboarding={creator.onboarding}
          canEdit={canManage}
          saving={saving}
          onSave={(onboarding: CreatorOnboardingTask[]) => patch({ onboarding })}
        />

        <CreatorDevelopmentPanel
          key={`dev-${creator.updatedAt}-${creator.developmentPlan?.updatedAt ?? "none"}`}
          plan={creator.developmentPlan}
          canEdit={canManage}
          saving={saving}
          onSeed={async () => {
            if (!id) return;
            setSaving(true);
            try {
              await saveDevelopmentPlan(getToken, id, { action: "seed" });
              await reload();
            } finally {
              setSaving(false);
            }
          }}
          onSave={async (plan: CreatorDevelopmentPlan) => {
            if (!id) return;
            setSaving(true);
            try {
              await saveDevelopmentPlan(getToken, id, { plan });
              await reload();
            } finally {
              setSaving(false);
            }
          }}
        />

        <CreatorDocumentsPanel
          key={`docs-${creator.updatedAt}`}
          documents={creator.documents ?? []}
          canEdit={canManage}
          canViewSensitive={canViewSensitive}
          saving={saving}
          onAdd={async (input: {
            kind: CreatorDocumentKind;
            label?: string;
            url?: string;
            fileDataUrl?: string;
            fileName?: string;
          }) => {
            if (!id) return;
            setSaving(true);
            try {
              const updated = await addCreatorDocument(getToken, id, input);
              hydrate(updated);
            } finally {
              setSaving(false);
            }
          }}
          onRemove={async (docId: string) => {
            if (!id) return;
            setSaving(true);
            try {
              const updated = await removeCreatorDocument(getToken, id, docId);
              hydrate(updated);
            } finally {
              setSaving(false);
            }
          }}
          onView={async (docId: string) => {
            if (!id) return;
            const { url } = await getCreatorDocumentViewUrl(getToken, id, docId);
            window.open(url, "_blank", "noopener,noreferrer");
          }}
        />

        <CreatorChangeHistoryPanel changeHistory={creator.changeHistory} />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete creator?"
        description="This removes the creator record. Linked business profiles and agreements are not affected."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!id) return;
          try {
            await deleteCreator(getToken, id);
            router.push("/creators");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete creator");
            setConfirmDelete(false);
          }
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
