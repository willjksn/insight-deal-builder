"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  contentIdeasGetProfile,
  contentIdeasUpdateProfile,
} from "@/lib/contentIdeas/apiClient";
import { emptyBrandProfile } from "@/lib/contentIdeas/defaults";
import { BrandProfile } from "@/lib/contentIdeas/types";
import { BrandProfileForm } from "@/components/contentIdeas/BrandProfileForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function EditBrandProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [draft, setDraft] = useState(() => emptyBrandProfile());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    contentIdeasGetProfile(() => user.getIdToken(), id)
      .then(({ profile }) => {
        const { id: _id, userId: _u, createdAt: _c, updatedAt: _up, ...rest } = profile;
        setDraft(rest as Omit<BrandProfile, "id" | "userId" | "createdAt" | "updatedAt">);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, id]);

  const save = async () => {
    if (!user || !id) return;
    setSaving(true);
    setError(null);
    try {
      await contentIdeasUpdateProfile(() => user.getIdToken(), id, draft);
      router.push("/content/profiles");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <Link
        href="/content/profiles"
        className="mb-4 inline-flex items-center text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Brand profiles
      </Link>
      <PageHeader title="Edit brand profile" subtitle={draft.basic.profileName} />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <Card>
        <CardBody className="space-y-4">
          <BrandProfileForm value={draft} onChange={setDraft} />
          <div className="flex gap-3">
            <Button onClick={save} disabled={saving || !draft.basic.profileName.trim()}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
