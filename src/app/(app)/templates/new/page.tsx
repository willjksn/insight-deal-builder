"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { InfoCallout, PageSection } from "@/components/ui/PageSection";
import { useMutations } from "@/hooks/useMutations";
import { useAuth } from "@/contexts/AuthContext";
import { canManageTemplates } from "@/lib/utils/permissions";
import { AGREEMENT_TYPE_OPTIONS } from "@/lib/constants/templateCatalog";
import { AgreementType } from "@/lib/types";
import { ArrowLeft, FileStack } from "lucide-react";

export default function NewTemplatePage() {
  const router = useRouter();
  const { appUser } = useAuth();
  const { create, saving } = useMutations("templates");
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "client_project" as AgreementType,
    body: "",
  });
  const [error, setError] = useState<string | null>(null);

  if (!canManageTemplates(appUser)) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold">Add template</h2>
        <p className="mt-2 text-slate-500">You need manage templates permission to create custom templates.</p>
        <Link href="/templates" className="mt-4 inline-block text-sky-600 hover:underline">
          Back to templates
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.body.trim()) {
      setError("Name and template body are required.");
      return;
    }
    try {
      const id = await create({
        name: form.name.trim(),
        description: form.description.trim(),
        type: form.type,
        body: form.body.trim(),
        isDefault: false,
      });
      router.push(`/templates/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/templates"
          className="inline-flex items-center text-sm font-medium text-sky-700 hover:text-sky-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          All templates
        </Link>
      </div>

      <PageHeader
        title="Add template"
        subtitle="Create a custom agreement structure for your team"
      />

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)}>
        <PageSection
          icon={FileStack}
          accent="violet"
          title="Template details"
          description="This wording is stored for your organization"
        >
          <div className="space-y-4">
            <Input
              label="Template name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Social content client package"
              required
              touch
            />
            <Input
              label="Short description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="When to use this template"
              touch
            />
            <Select
              label="Agreement type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AgreementType }))}
              options={AGREEMENT_TYPE_OPTIONS}
              touch
            />
            <Textarea
              label="Template body"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Paste or write the default agreement clauses…"
              className="min-h-[320px] font-mono text-sm"
              required
              touch
            />
            <InfoCallout variant="blue">
              A Gemini AI assistant will help draft and refine templates in a future update. For
              now, paste your clause text or start from a built-in template and customize a copy.
            </InfoCallout>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" size="touch" disabled={saving}>
                {saving ? "Saving…" : "Create template"}
              </Button>
              <Link href="/templates">
                <Button type="button" variant="outline" size="touch">
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </PageSection>
      </form>
    </div>
  );
}
