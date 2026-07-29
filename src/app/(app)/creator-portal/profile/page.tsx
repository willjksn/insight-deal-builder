"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getCreatorPortalMe, updateCreatorPortalMe } from "@/lib/creators/apiClient";

export default function CreatorPortalProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    professionalName: "",
    phone: "",
    location: "",
    website: "",
    portfolioUrl: "",
    primaryNiche: "",
    audienceDescription: "",
  });

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
        const creator = await getCreatorPortalMe(getToken);
        if (cancelled) return;
        setForm({
          professionalName: creator.professionalName ?? "",
          phone: creator.phone ?? "",
          location: creator.location ?? "",
          website: creator.website ?? "",
          portfolioUrl: creator.portfolioUrl ?? "",
          primaryNiche: creator.primaryNiche ?? "",
          audienceDescription: creator.audienceDescription ?? "",
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getToken]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateCreatorPortalMe(getToken, {
        professionalName: form.professionalName.trim(),
        phone: form.phone.trim() || undefined,
        location: form.location.trim() || undefined,
        website: form.website.trim() || undefined,
        portfolioUrl: form.portfolioUrl.trim() || undefined,
        primaryNiche: form.primaryNiche.trim() || undefined,
        audienceDescription: form.audienceDescription.trim() || undefined,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          Keep your contact details and positioning up to date for IMG.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Profile saved.
        </div>
      )}

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Public details</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Professional name"
              value={form.professionalName}
              onChange={(e) => setForm({ ...form, professionalName: e.target.value })}
              required
              touch
            />
            <div className="grid gap-4 md:grid-cols-2">
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
            </div>
            <Input
              label="Primary niche"
              value={form.primaryNiche}
              onChange={(e) => setForm({ ...form, primaryNiche: e.target.value })}
              touch
            />
            <Input
              label="Website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              touch
            />
            <Input
              label="Portfolio URL"
              value={form.portfolioUrl}
              onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
              touch
            />
            <Textarea
              label="Audience description"
              value={form.audienceDescription}
              onChange={(e) => setForm({ ...form, audienceDescription: e.target.value })}
              touch
            />
            <Button type="submit" size="touch" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </CardBody>
        </Card>
      </form>
    </div>
  );
}
