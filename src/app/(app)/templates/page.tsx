"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { InfoCallout, PageSection } from "@/components/ui/PageSection";
import { useCollection } from "@/hooks/useCollection";
import { useAuth } from "@/contexts/AuthContext";
import { canManageTemplates } from "@/lib/utils/permissions";
import { BUILTIN_TEMPLATES } from "@/lib/constants/templateCatalog";
import { Template } from "@/lib/types";
import { getAgreementTypeLabel } from "@/lib/agreement/wizardSteps";
import { ChevronRight, FileStack, Plus, Sparkles } from "lucide-react";

export default function TemplatesPage() {
  const { appUser } = useAuth();
  const { data: customTemplates, loading } = useCollection<Template>("templates");
  const canEdit = canManageTemplates(appUser);

  return (
    <div>
      <PageHeader
        title="Templates"
        subtitle="Built-in agreement structures and your custom templates — click to view full wording"
        action={
          canEdit ? (
            <Link href="/templates/new">
              <Button size="touch">
                <Plus className="mr-2 h-4 w-4" />
                Add template
              </Button>
            </Link>
          ) : undefined
        }
      />

      <PageSection
        className="mb-6"
        icon={FileStack}
        accent="sky"
        title="Built-in templates"
        description="Applied automatically when you start a new quote of that type in the wizard"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BUILTIN_TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <Link
              key={template.id}
              href={`/templates/${template.id}`}
              className="group rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-md shadow-slate-200/30 ring-1 ring-slate-100 transition-all hover:border-sky-300 hover:shadow-lg hover:ring-sky-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-md shadow-sky-500/25">
                  <Icon className="h-5 w-5" />
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-500" />
              </div>
              <p className="mt-4 font-semibold text-slate-900">{template.name}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{template.description}</p>
              <div className="mt-3">
                <Badge variant="info">{template.categoryLabel}</Badge>
              </div>
            </Link>
          );
        })}
      </div>

      {canEdit && (
        <>
          <PageSection
            className="mb-6"
            icon={Sparkles}
            accent="violet"
            title="Custom templates"
            description="Your own agreement structures — AI-assisted drafting coming soon"
          />

          {loading ? (
            <LoadingSpinner className="py-12" />
          ) : customTemplates.length === 0 ? (
            <InfoCallout variant="blue">
              <p>
                No custom templates yet. Use <strong>Add template</strong> to create one, or wait
                for the Gemini assistant to help draft clauses later.
              </p>
            </InfoCallout>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {customTemplates.map((template) => (
                <Link
                  key={template.id}
                  href={`/templates/${template.id}`}
                  className="group rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50/50 to-white p-5 ring-1 ring-violet-100 transition-all hover:border-violet-300 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 text-white shadow-md">
                      <FileStack className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-500" />
                  </div>
                  <p className="mt-4 font-semibold text-slate-900">{template.name}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {template.description || "Custom agreement template"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="default">Custom</Badge>
                    <Badge variant="info">{getAgreementTypeLabel(template.type)}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      <PageSection
        className="mt-8"
        icon={Sparkles}
        accent="violet"
        title="How templates work"
        description="Templates seed the wizard — every quote stays customizable"
      >
        <InfoCallout variant="sky">
          <p>
            When you create a new agreement, pick a built-in or custom template on step 1 of the
            wizard. Customize payout splits, gear, deliverables, and policies per project.
          </p>
        </InfoCallout>
      </PageSection>
    </div>
  );
}
