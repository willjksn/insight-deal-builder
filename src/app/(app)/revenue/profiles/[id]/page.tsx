"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  revenueDeleteProfile,
  revenueGetProfile,
  revenueUpdateProfile,
} from "@/lib/revenueOpportunities/apiClient";
import type { BusinessProfile } from "@/lib/revenueOpportunities/types/businessProfile";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { formatDateTime } from "@/lib/utils/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProfileForm } from "@/components/revenue/ProfileForm";

const TYPE_LABELS: Record<BusinessProfile["profileType"], string> = {
  img: "Insight Media Group",
  stormi: "Stormi",
  other: "Other",
};

export default function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, appUser } = useAuth();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const canManage = canManageRevenueOpportunities(appUser);

  useEffect(() => {
    if (!user || !id) return;
    revenueGetProfile(() => user.getIdToken(), id)
      .then((res) => setProfile(res.profile))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, id]);

  if (loading) return <LoadingSpinner />;
  if (!profile) return <p className="text-sm text-red-600">{error ?? "Profile not found"}</p>;

  return (
    <>
      <Link href="/revenue/profiles" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Profiles
      </Link>
      <PageHeader
        title={profile.name}
        subtitle={`${TYPE_LABELS[profile.profileType]} · ${profile.status}`}
        action={
          canManage ? (
            <Button
              size="touch"
              variant="outline"
              disabled={busy || deleting}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-2 h-4 w-4 text-red-500" />
              Delete
            </Button>
          ) : undefined
        }
      />

      {profile.review ? (
        <Card className="mb-4">
          <CardBody className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <span>
              Source: <strong className="text-slate-900">{profile.review.source}</strong>
              {typeof profile.review.confidence === "number"
                ? ` · confidence ${Math.round(profile.review.confidence * 100)}%`
                : ""}
            </span>
            <span>Last updated: {formatDateTime(profile.review.lastUpdatedAt)}</span>
            {profile.review.lastReviewedAt ? (
              <span>Last reviewed: {formatDateTime(profile.review.lastReviewedAt)}</span>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {savedMessage && <p className="mb-4 text-sm text-emerald-700">{savedMessage}</p>}

      {canManage ? (
        <ProfileForm
          initial={{
            name: profile.name,
            profileType: profile.profileType,
            status: profile.status,
            fields: profile.fields ?? {},
          }}
          busy={busy}
          submitLabel="Save changes"
          onSubmit={async (value) => {
            if (!user) return;
            setBusy(true);
            setError(null);
            setSavedMessage(null);
            try {
              const res = await revenueUpdateProfile(() => user.getIdToken(), id, {
                name: value.name,
                profileType: value.profileType,
                status: value.status,
                fields: value.fields,
              });
              setProfile(res.profile);
              setSavedMessage("Profile saved.");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Update failed");
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : (
        <p className="text-sm text-slate-600">View-only access.</p>
      )}

      {profile.changeHistory && profile.changeHistory.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <h3 className="font-semibold text-slate-900">Change history</h3>
            <p className="text-sm text-slate-500">Most recent edits first.</p>
          </CardHeader>
          <CardBody>
            <div className="space-y-2 text-sm">
              {profile.changeHistory.slice(0, 40).map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-2 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {entry.field}
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        {entry.source}
                      </span>
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {entry.previousValue ? `${entry.previousValue} → ` : "set → "}
                      {entry.newValue ?? "(cleared)"}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">
                    {entry.changedByDisplayName ? `${entry.changedByDisplayName} · ` : ""}
                    {formatDateTime(entry.changedAt)}
                  </p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete profile?"
        description={`Delete “${profile.name}”? Missions linked to it keep their own targeting fields. This cannot be undone.`}
        confirmLabel="Delete profile"
        loading={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (!user) return;
          setDeleting(true);
          setError(null);
          try {
            await revenueDeleteProfile(() => user.getIdToken(), id);
            router.push("/revenue/profiles");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Delete failed");
            setDeleting(false);
            setConfirmDelete(false);
          }
        }}
      />
    </>
  );
}
