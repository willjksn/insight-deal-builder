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
import { canManageCreators } from "@/lib/utils/permissions";
import { deleteCreator, getCreator, updateCreator } from "@/lib/creators/apiClient";
import {
  CREATOR_READINESS_LABELS,
  CREATOR_RELATIONSHIP_LABELS,
  CREATOR_STATUS_LABELS,
  type Creator,
  type CreatorReadinessStatus,
  type CreatorRelationshipType,
  type CreatorStatus,
  type CreatorUpdateInput,
} from "@/lib/creators/types";

const RELATIONSHIP_OPTIONS = (
  Object.keys(CREATOR_RELATIONSHIP_LABELS) as CreatorRelationshipType[]
).map((value) => ({ value, label: CREATOR_RELATIONSHIP_LABELS[value] }));
const STATUS_OPTIONS = (Object.keys(CREATOR_STATUS_LABELS) as CreatorStatus[]).map((value) => ({
  value,
  label: CREATOR_STATUS_LABELS[value],
}));
const READINESS_OPTIONS = (
  Object.keys(CREATOR_READINESS_LABELS) as CreatorReadinessStatus[]
).map((value) => ({ value, label: CREATOR_READINESS_LABELS[value] }));

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

  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Editable form state (flattened; arrays as comma text).
  const [form, setForm] = useState({
    professionalName: "",
    legalName: "",
    relationshipType: "network" as CreatorRelationshipType,
    status: "active" as CreatorStatus,
    readinessStatus: "not_reviewed" as CreatorReadinessStatus,
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
    setForm({
      professionalName: c.professionalName ?? "",
      legalName: c.legalName ?? "",
      relationshipType: c.relationshipType ?? "network",
      status: c.status ?? "active",
      readinessStatus: c.readinessStatus ?? "not_reviewed",
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

  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);
    getCreator(getToken, id)
      .then((c) => {
        setCreator(c);
        hydrate(c);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load creator"))
      .finally(() => setLoading(false));
  }, [user, id, getToken, hydrate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    const payload: CreatorUpdateInput = {
      professionalName: form.professionalName.trim(),
      legalName: form.legalName.trim(),
      relationshipType: form.relationshipType,
      status: form.status,
      readinessStatus: form.readinessStatus,
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
    };
    try {
      const updated = await updateCreator(getToken, id, payload);
      setCreator(updated);
      hydrate(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save creator");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteCreator(getToken, id);
      router.push("/creators");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete creator");
      setConfirmDelete(false);
    }
  };

  if (loading) return <LoadingSpinner className="py-20" />;
  if (!creator) {
    return (
      <div>
        <Link href="/creators" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
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
      <Link href="/creators" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
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

      <form onSubmit={handleSave} className="space-y-6">
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
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Relationship &amp; readiness</h2>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 md:grid-cols-3">
              <Select
                label="Relationship"
                value={form.relationshipType}
                onChange={(e) =>
                  setForm({ ...form, relationshipType: e.target.value as CreatorRelationshipType })
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
              <Select
                label="Readiness"
                value={form.readinessStatus}
                onChange={(e) =>
                  setForm({ ...form, readinessStatus: e.target.value as CreatorReadinessStatus })
                }
                options={READINESS_OPTIONS}
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
          <div className="flex gap-3">
            <Button type="submit" size="touch" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}
      </form>

      {creator.changeHistory && creator.changeHistory.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Recent changes</h2>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-600">
              {creator.changeHistory.slice(0, 10).map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">{entry.field}</Badge>
                  <span className="text-slate-400 line-through">{entry.previousValue || "—"}</span>
                  <span aria-hidden>→</span>
                  <span className="text-slate-900">{entry.newValue || "—"}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(entry.changedAt).toLocaleDateString()}
                    {entry.changedByDisplayName ? ` · ${entry.changedByDisplayName}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete creator?"
        description="This removes the creator record. Linked business profiles and agreements are not affected."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
