"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { DataTable, DataRow } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ListSearchField } from "@/components/ui/ListSearchField";
import { useAuth } from "@/contexts/AuthContext";
import { canManageCreators } from "@/lib/utils/permissions";
import { createCreator, listCreators } from "@/lib/creators/apiClient";
import {
  CREATOR_APPLICATION_STATUS_LABELS,
  isOpenApplication,
  type Creator,
  type CreatorApplicationStatus,
} from "@/lib/creators/types";

function appVariant(status?: CreatorApplicationStatus) {
  if (!status) return "default" as const;
  if (status === "approved" || status === "approved_with_development") return "success" as const;
  if (status === "rejected" || status === "withdrawn" || status === "archived") return "danger" as const;
  if (isOpenApplication(status)) return "info" as const;
  return "default" as const;
}

const emptyForm = {
  professionalName: "",
  email: "",
  phone: "",
  location: "",
  primaryNiche: "",
  portfolioUrl: "",
  source: "",
  referralSource: "",
  notes: "",
};

export default function CreatorApplicationsPage() {
  const { user, appUser } = useAuth();
  const canManage = canManageCreators(appUser);

  const [applicants, setApplicants] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"open" | "all" | "approved" | "closed">("open");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const getToken = useCallback(() => {
    if (!user) throw new Error("Not signed in");
    return user.getIdToken();
  }, [user]);

  const reload = useCallback(async () => {
    if (!user) return;
    const list = await listCreators(getToken, { applicantsOnly: true });
    setApplicants(list);
  }, [user, getToken]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load applications"))
      .finally(() => setLoading(false));
  }, [user, reload]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.professionalName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createCreator(getToken, {
        professionalName: form.professionalName.trim(),
        relationshipType: "applicant",
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        location: form.location.trim() || undefined,
        primaryNiche: form.primaryNiche.trim() || undefined,
        portfolioUrl: form.portfolioUrl.trim() || undefined,
        source: form.source.trim() || "internal",
        referralSource: form.referralSource.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setForm(emptyForm);
      setShowForm(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create application");
    } finally {
      setSaving(false);
    }
  };

  const filtered = applicants.filter((c) => {
    const status = c.applicationStatus;
    if (filter === "open" && !isOpenApplication(status)) return false;
    if (filter === "approved" && status !== "approved" && status !== "approved_with_development") {
      return false;
    }
    if (
      filter === "closed" &&
      status !== "rejected" &&
      status !== "withdrawn" &&
      status !== "archived" &&
      status !== "waitlisted"
    ) {
      return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.professionalName.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.primaryNiche ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Creator applications"
        subtitle="External applicants enter here — review, interview, approve, then invite to ShootSpine"
        action={
          canManage ? (
            <Button size="touch" onClick={() => setShowForm((v) => !v)}>
              Add manually
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/creators" className="font-semibold text-sky-700 hover:text-sky-900">
            ← Creator roster
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            href="/apply/creators"
            target="_blank"
            className="font-semibold text-sky-700 hover:text-sky-900"
          >
            Public apply form ↗
          </Link>
        </div>
        <p className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-slate-600">
          Add this on{" "}
          <a
            href="https://insightmediagroupllc.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sky-700 hover:underline"
          >
            insightmediagroupllc.com
          </a>
          :{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs text-sky-900">
            /apply/creators
          </code>{" "}
          (your ShootSpine domain + that path). Creators apply with no account; after you approve,
          invite them to ShootSpine.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="min-w-[200px] flex-1">
          <ListSearchField
            label="Search applications"
            value={search}
            onChange={setSearch}
            placeholder="Search by name, email, niche…"
          />
        </div>
        <Select
          label="Filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          options={[
            { value: "open", label: "Open pipeline" },
            { value: "approved", label: "Approved" },
            { value: "closed", label: "Closed" },
            { value: "all", label: "All" },
          ]}
          wrapperClassName="w-44"
          touch
        />
      </div>

      {showForm && canManage && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Add applicant manually</h2>
            <p className="mt-1 text-xs text-slate-500">
              Use when someone applied offline (DM, email, event). Public applicants use /apply/creators.
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              <Input
                label="Name"
                value={form.professionalName}
                onChange={(e) => setForm({ ...form, professionalName: e.target.value })}
                required
                touch
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                touch
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                touch
              />
              <Input
                label="Location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                touch
              />
              <Input
                label="Primary niche"
                value={form.primaryNiche}
                onChange={(e) => setForm({ ...form, primaryNiche: e.target.value })}
                touch
              />
              <Input
                label="Portfolio / media kit URL"
                value={form.portfolioUrl}
                onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
                touch
              />
              <Input
                label="Source"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="referral, outreach, event…"
                touch
              />
              <Input
                label="Referral source"
                value={form.referralSource}
                onChange={(e) => setForm({ ...form, referralSource: e.target.value })}
                touch
              />
              <div className="md:col-span-2">
                <Textarea
                  label="Notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  touch
                />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <Button type="submit" size="touch" disabled={saving}>
                  {saving ? "Saving…" : "Submit application"}
                </Button>
                <Button type="button" variant="outline" size="touch" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <LoadingSpinner className="py-20" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={applicants.length === 0 ? "No applications yet" : "No matches"}
          description={
            applicants.length === 0
              ? "Create an internal application to start reviewing a creator."
              : "Try a different filter or search."
          }
        />
      ) : (
        <DataTable headers={["Applicant", "Niche", "Stage", "Submitted", ""]}>
          {filtered.map((c) => (
            <DataRow
              key={c.id}
              cells={[
                <div key="name" className="min-w-0">
                  <div className="font-semibold text-slate-900">{c.professionalName}</div>
                  {c.email && <div className="truncate text-xs text-slate-500">{c.email}</div>}
                </div>,
                c.primaryNiche || "—",
                <Badge key="stage" variant={appVariant(c.applicationStatus)}>
                  {c.applicationStatus
                    ? CREATOR_APPLICATION_STATUS_LABELS[c.applicationStatus]
                    : "—"}
                </Badge>,
                c.applicationSubmittedAt
                  ? new Date(c.applicationSubmittedAt).toLocaleDateString()
                  : "—",
                <Link
                  key="open"
                  href={`/creators/${c.id}`}
                  className="text-sm font-semibold text-sky-700 hover:text-sky-900"
                >
                  Review
                </Link>,
              ]}
            />
          ))}
        </DataTable>
      )}
    </div>
  );
}
