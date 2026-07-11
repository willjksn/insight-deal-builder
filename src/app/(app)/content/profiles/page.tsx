"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  contentIdeasCreateProfile,
  contentIdeasDeleteProfile,
  contentIdeasListProfiles,
} from "@/lib/contentIdeas/apiClient";
import { emptyBrandProfile } from "@/lib/contentIdeas/defaults";
import { BrandProfile } from "@/lib/contentIdeas/types";
import { BrandProfileForm } from "@/components/contentIdeas/BrandProfileForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function BrandProfilesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState(() => emptyBrandProfile());
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    contentIdeasListProfiles(() => user.getIdToken())
      .then((res) => setProfiles(res.profiles))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user]);

  const saveNew = async () => {
    if (!user) return;
    setCreating(true);
    setError(null);
    try {
      const { profile } = await contentIdeasCreateProfile(() => user.getIdToken(), draft);
      router.push(`/content/profiles/${profile.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = async () => {
    if (!user || !deleteId) return;
    try {
      await contentIdeasDeleteProfile(() => user.getIdToken(), deleteId);
      setProfiles((p) => p.filter((x) => x.id !== deleteId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <Link
        href="/content"
        className="mb-4 inline-flex items-center text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Content development
      </Link>
      <PageHeader
        title="Brand profiles"
        subtitle="Full profiles power better idea scoring and script writer handoff."
        action={
          <Button size="touch" onClick={() => setShowCreate((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            {showCreate ? "Cancel" : "New profile"}
          </Button>
        }
      />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {showCreate && (
        <Card className="mb-8">
          <CardBody className="space-y-4">
            <BrandProfileForm value={draft} onChange={setDraft} />
            <Button onClick={saveNew} disabled={creating || !draft.basic.profileName.trim()}>
              {creating ? "Saving…" : "Create profile"}
            </Button>
          </CardBody>
        </Card>
      )}

      {loading && <LoadingSpinner />}
      <div className="space-y-3">
        {profiles.map((p) => (
          <Card key={p.id}>
            <CardBody className="flex items-center justify-between gap-4">
              <Link href={`/content/profiles/${p.id}`} className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{p.basic.profileName}</p>
                <p className="text-sm text-slate-600 capitalize">{p.type} · {p.basic.businessOrCreatorName ?? "—"}</p>
              </Link>
              <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => setDeleteId(p.id)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </CardBody>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete profile?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
