"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ContentPanel, InfoCallout, PageSection } from "@/components/ui/PageSection";
import { useDocument } from "@/hooks/useDocument";
import { useMutations } from "@/hooks/useMutations";
import { useAuth } from "@/contexts/AuthContext";
import { canDeleteTemplates, canManageTemplates } from "@/lib/utils/permissions";
import {
  AGREEMENT_TYPE_OPTIONS,
  getBuiltinTemplate,
  isBuiltinTemplateId,
} from "@/lib/constants/templateCatalog";
import { getAgreementTypeLabel } from "@/lib/agreement/wizardSteps";
import { Template } from "@/lib/types";
import { ArrowLeft, FileStack, Pencil, Trash2 } from "lucide-react";

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { appUser } = useAuth();
  const isBuiltin = isBuiltinTemplateId(id);
  const builtin = isBuiltin ? getBuiltinTemplate(id) : undefined;
  const { data: custom, loading, refresh } = useDocument<Template>("templates", isBuiltin ? undefined : id);
  const { update, remove, saving } = useMutations("templates");

  const canEdit = canManageTemplates(appUser);
  const canDelete = canDeleteTemplates(appUser);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", type: custom?.type ?? "client_project", body: "" });
  const [error, setError] = useState<string | null>(null);

  const template = isBuiltin
    ? builtin
      ? {
          id: builtin.id,
          name: builtin.name,
          description: builtin.description,
          type: builtin.type,
          body: builtin.body,
        }
      : null
    : custom
      ? {
          id: custom.id,
          name: custom.name,
          description: custom.description,
          type: custom.type,
          body: custom.body ?? "",
        }
      : null;

  const startEdit = () => {
    if (!custom) return;
    setForm({
      name: custom.name,
      description: custom.description,
      type: custom.type,
      body: custom.body ?? "",
    });
    setEditing(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!custom) return;
    setError(null);
    if (!form.name.trim() || !form.body.trim()) {
      setError("Name and template body are required.");
      return;
    }
    try {
      await update(custom.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        type: form.type,
        body: form.body.trim(),
        isDefault: false,
      });
      setEditing(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    }
  };

  const handleDelete = async () => {
    if (!custom || !window.confirm(`Delete template "${custom.name}"? This cannot be undone.`)) return;
    try {
      await remove(custom.id);
      router.push("/templates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    }
  };

  if (!isBuiltin && loading) return <LoadingSpinner className="py-20" />;

  if (!template) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold">Template not found</h2>
        <Link href="/templates" className="mt-4 inline-block text-sky-600 hover:underline">
          Back to templates
        </Link>
      </div>
    );
  }

  const Icon = isBuiltin ? getBuiltinTemplate(id)?.icon : undefined;

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
        title={editing ? "Edit template" : template.name}
        subtitle={editing ? undefined : template.description}
        action={
          !isBuiltin && canEdit && !editing ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="touch" onClick={startEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              {canDelete && (
                <Button variant="outline" size="touch" onClick={() => void handleDelete()} disabled={saving}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {!editing && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Badge variant={isBuiltin ? "info" : "default"}>{isBuiltin ? "Built-in" : "Custom"}</Badge>
          <Badge variant="success">{getAgreementTypeLabel(template.type)}</Badge>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {editing ? (
        <PageSection
          icon={FileStack}
          accent="violet"
          title="Template details"
          description="Custom clause text for this agreement type"
        >
          <div className="space-y-4">
            <Input
              label="Template name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              touch
            />
            <Input
              label="Short description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              touch
            />
            <Select
              label="Agreement type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Template["type"] }))}
              options={AGREEMENT_TYPE_OPTIONS}
              touch
            />
            <Textarea
              label="Template body"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className="min-h-[320px] font-mono text-sm"
              touch
            />
            <InfoCallout variant="blue">
              Gemini AI will help draft and refine custom templates in a future update.
            </InfoCallout>
            <div className="flex flex-wrap gap-2">
              <Button size="touch" onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button size="touch" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </PageSection>
      ) : (
        <PageSection
          icon={Icon ?? FileStack}
          accent="sky"
          title="Agreement wording"
          description="Default clauses seeded when this template type is used in the wizard"
        >
          <ContentPanel>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
              {template.body}
            </pre>
          </ContentPanel>
        </PageSection>
      )}
    </div>
  );
}
