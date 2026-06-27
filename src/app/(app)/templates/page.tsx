"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ContentPanel, InfoCallout, PageSection } from "@/components/ui/PageSection";
import { INTERNAL_AGREEMENT_TEMPLATE, CLIENT_AGREEMENT_TEMPLATE, EQUIPMENT_RENTAL_AGREEMENT_TEMPLATE, TALENT_AGREEMENT_TEMPLATE, CONTRACTOR_AGREEMENT_TEMPLATE, LOCATION_AGREEMENT_TEMPLATE } from "@/lib/constants/clauses";
import { FileStack, Handshake, Users, Sparkles, HardDrive, UserCircle, Briefcase, MapPin } from "lucide-react";

export default function TemplatesPage() {
  return (
    <div>
      <PageHeader
        title="Templates"
        subtitle="Built-in agreement structures applied when you start a new quote in the wizard"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50 to-white p-4 ring-1 ring-sky-100">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Internal</p>
          <p className="mt-1 text-sm text-slate-600">Insight + partner collaborations, payouts & gear</p>
        </div>
        <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50 to-white p-4 ring-1 ring-sky-100">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Client</p>
          <p className="mt-1 text-sm text-slate-600">Production company + client deliverables & payment</p>
        </div>
        <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50 to-white p-4 ring-1 ring-sky-100">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Equipment Rental</p>
          <p className="mt-1 text-sm text-slate-600">Rent IMG gear to AVE, clients, or partners with line-item pricing</p>
        </div>
        <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50 to-white p-4 ring-1 ring-sky-100">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Talent</p>
          <p className="mt-1 text-sm text-slate-600">On-camera talent, releases, usage, ID verification</p>
        </div>
        <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50 to-white p-4 ring-1 ring-sky-100">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Contractor</p>
          <p className="mt-1 text-sm text-slate-600">Crew & contractors — services, pay, W-9, work-for-hire</p>
        </div>
        <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50 to-white p-4 ring-1 ring-sky-100">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Location / Prop</p>
          <p className="mt-1 text-sm text-slate-600">Film locations, property releases, prop line-item fees</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <PageSection
          icon={Handshake}
          accent="sky"
          title="Internal Collaboration"
          description="Default clauses for IMG ↔ partner deals"
          action={<Badge variant="warning">Internal</Badge>}
        >
          <ContentPanel className="max-h-[420px] overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
              {INTERNAL_AGREEMENT_TEMPLATE}
            </pre>
          </ContentPanel>
        </PageSection>

        <PageSection
          icon={Users}
          accent="sky"
          title="Client Project"
          description="Default clauses for client-facing agreements"
          action={<Badge variant="info">Client</Badge>}
        >
          <ContentPanel className="max-h-[420px] overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
              {CLIENT_AGREEMENT_TEMPLATE}
            </pre>
          </ContentPanel>
        </PageSection>

        <PageSection
          icon={HardDrive}
          accent="sky"
          title="Equipment Rental"
          description="Gear schedule, deposit, insurance, and return terms"
          action={<Badge variant="success">Rental</Badge>}
        >
          <ContentPanel className="max-h-[420px] overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
              {EQUIPMENT_RENTAL_AGREEMENT_TEMPLATE}
            </pre>
          </ContentPanel>
        </PageSection>

        <PageSection
          icon={UserCircle}
          accent="sky"
          title="Talent Agreement"
          description="Appearance, compensation, likeness release, age verification"
          action={<Badge variant="warning">Talent</Badge>}
        >
          <ContentPanel className="max-h-[420px] overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
              {TALENT_AGREEMENT_TEMPLATE}
            </pre>
          </ContentPanel>
        </PageSection>

        <PageSection
          icon={Briefcase}
          accent="sky"
          title="Contractor Agreement"
          description="Crew/contractor services, 1099-ready tax fields, work-for-hire"
          action={<Badge variant="default">Contractor</Badge>}
        >
          <ContentPanel className="max-h-[420px] overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
              {CONTRACTOR_AGREEMENT_TEMPLATE}
            </pre>
          </ContentPanel>
        </PageSection>

        <PageSection
          icon={MapPin}
          accent="sky"
          title="Location & Prop"
          description="Property use, prop rental, insurance, and owner release"
          action={<Badge variant="success">Location</Badge>}
        >
          <ContentPanel className="max-h-[420px] overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
              {LOCATION_AGREEMENT_TEMPLATE}
            </pre>
          </ContentPanel>
        </PageSection>
      </div>

      <PageSection
        className="mt-6"
        icon={Sparkles}
        accent="violet"
        title="How templates work"
        description="Templates seed the wizard — every quote stays customizable"
      >
        <InfoCallout variant="sky">
          <p>
            Templates are applied automatically when you create a new agreement. Use the wizard to
            customize clauses, payout splits, gear packages, deliverables, and policies for each project.
          </p>
        </InfoCallout>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <FileStack className="h-5 w-5 text-violet-500 shrink-0" />
          <span>
            Need to change default wording long-term? Edit{" "}
            <code className="rounded-md bg-white px-1.5 py-0.5 text-xs ring-1 ring-slate-200">
              src/lib/constants/clauses.ts
            </code>
          </span>
        </div>
      </PageSection>
    </div>
  );
}
