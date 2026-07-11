"use client";

import { BrandProfile, BrandProfileType } from "@/lib/contentIdeas/types";
import { Input } from "@/components/ui/Input";

type ProfileDraft = Omit<BrandProfile, "id" | "userId" | "createdAt" | "updatedAt">;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </span>
  );
}

function Section({
  title,
  children,
  defaultOpen,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-xl border border-slate-200 bg-white group"
    >
      <summary className="cursor-pointer list-none px-4 py-3 font-medium text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
        {title}
      </summary>
      <div className="space-y-4 border-t border-slate-100 px-4 py-4">{children}</div>
    </details>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  placeholder,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {multiline ? (
        <textarea
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          rows={3}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          className="mt-1"
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

export function BrandProfileForm({
  value,
  onChange,
}: {
  value: ProfileDraft;
  onChange: (next: ProfileDraft) => void;
}) {
  const setType = (type: BrandProfileType) => onChange({ ...value, type });
  const setBasic = (key: keyof ProfileDraft["basic"], v: string) =>
    onChange({ ...value, basic: { ...value.basic, [key]: v } });
  const setSection = (
    section: "brandIdentity" | "creatorIdentity" | "audience" | "business" | "productionPreferences" | "safety",
    key: string,
    v: string
  ) => {
    const current = (value[section] ?? {}) as Record<string, string | undefined>;
    onChange({ ...value, [section]: { ...current, [key]: v } });
  };

  const types: { id: BrandProfileType; label: string }[] = [
    { id: "business", label: "Business" },
    { id: "brand", label: "Brand" },
    { id: "creator", label: "Creator" },
    { id: "influencer", label: "Influencer" },
    { id: "product", label: "Product" },
    { id: "client", label: "Client" },
    { id: "internal", label: "Internal" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Profile type</FieldLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={`rounded-full px-3 py-1 text-sm ${
                value.type === t.id
                  ? "bg-sky-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <Section title="Basic info" defaultOpen>
        <Field label="Profile name *" value={value.basic.profileName} onChange={(v) => setBasic("profileName", v)} />
        <Field label="Business / creator name" value={value.basic.businessOrCreatorName} onChange={(v) => setBasic("businessOrCreatorName", v)} />
        <Field label="Industry" value={value.basic.industry} onChange={(v) => setBasic("industry", v)} />
        <Field label="Website" value={value.basic.website} onChange={(v) => setBasic("website", v)} />
        <Field label="Social handles" value={value.basic.socialHandles} onChange={(v) => setBasic("socialHandles", v)} />
        <Field label="Primary contact" value={value.basic.primaryContact} onChange={(v) => setBasic("primaryContact", v)} />
        <Field label="Location" value={value.basic.location} onChange={(v) => setBasic("location", v)} />
        <Field label="Notes" value={value.basic.notes} onChange={(v) => setBasic("notes", v)} multiline />
      </Section>

      <Section title="Brand identity">
        <Field label="Description" value={value.brandIdentity?.description} onChange={(v) => setSection("brandIdentity", "description", v)} multiline />
        <Field label="Mission" value={value.brandIdentity?.mission} onChange={(v) => setSection("brandIdentity", "mission", v)} multiline />
        <Field label="Personality" value={value.brandIdentity?.personality} onChange={(v) => setSection("brandIdentity", "personality", v)} />
        <Field label="Voice" value={value.brandIdentity?.voice} onChange={(v) => setSection("brandIdentity", "voice", v)} />
        <Field label="Visual identity" value={value.brandIdentity?.visualIdentity} onChange={(v) => setSection("brandIdentity", "visualIdentity", v)} multiline />
        <Field label="Brand words" value={value.brandIdentity?.brandWords} onChange={(v) => setSection("brandIdentity", "brandWords", v)} />
        <Field label="Avoid words" value={value.brandIdentity?.avoidWords} onChange={(v) => setSection("brandIdentity", "avoidWords", v)} />
        <Field label="Slogan" value={value.brandIdentity?.slogan} onChange={(v) => setSection("brandIdentity", "slogan", v)} />
      </Section>

      <Section title="Creator identity">
        <Field label="Creator name" value={value.creatorIdentity?.creatorName} onChange={(v) => setSection("creatorIdentity", "creatorName", v)} />
        <Field label="Niche" value={value.creatorIdentity?.niche} onChange={(v) => setSection("creatorIdentity", "niche", v)} />
        <Field label="On-camera style" value={value.creatorIdentity?.onCameraStyle} onChange={(v) => setSection("creatorIdentity", "onCameraStyle", v)} />
        <Field label="Content strengths" value={value.creatorIdentity?.contentStrengths} onChange={(v) => setSection("creatorIdentity", "contentStrengths", v)} multiline />
        <Field label="Topics to avoid" value={value.creatorIdentity?.topicsAvoid} onChange={(v) => setSection("creatorIdentity", "topicsAvoid", v)} multiline />
        <Field label="Recurring series" value={value.creatorIdentity?.recurringSeries} onChange={(v) => setSection("creatorIdentity", "recurringSeries", v)} />
      </Section>

      <Section title="Audience">
        <Field label="Primary audience" value={value.audience?.primaryAudience} onChange={(v) => setSection("audience", "primaryAudience", v)} multiline />
        <Field label="Age range" value={value.audience?.ageRange} onChange={(v) => setSection("audience", "ageRange", v)} />
        <Field label="Pain points" value={value.audience?.painPoints} onChange={(v) => setSection("audience", "painPoints", v)} multiline />
        <Field label="Aspirations" value={value.audience?.aspirations} onChange={(v) => setSection("audience", "aspirations", v)} multiline />
        <Field label="Desired emotional response" value={value.audience?.desiredEmotionalResponse} onChange={(v) => setSection("audience", "desiredEmotionalResponse", v)} />
      </Section>

      <Section title="Business">
        <Field label="Products" value={value.business?.products} onChange={(v) => setSection("business", "products", v)} multiline />
        <Field label="Services" value={value.business?.services} onChange={(v) => setSection("business", "services", v)} multiline />
        <Field label="USP" value={value.business?.uniqueSellingProposition} onChange={(v) => setSection("business", "uniqueSellingProposition", v)} multiline />
        <Field label="Primary conversion goal" value={value.business?.primaryConversionGoal} onChange={(v) => setSection("business", "primaryConversionGoal", v)} />
        <Field label="Competitors" value={value.business?.competitors} onChange={(v) => setSection("business", "competitors", v)} multiline />
      </Section>

      <Section title="Production preferences">
        <Field label="Preferred content length" value={value.productionPreferences?.preferredContentLength} onChange={(v) => setSection("productionPreferences", "preferredContentLength", v)} />
        <Field label="Visual style" value={value.productionPreferences?.visualStyle} onChange={(v) => setSection("productionPreferences", "visualStyle", v)} />
        <Field label="Lighting style" value={value.productionPreferences?.lightingStyle} onChange={(v) => setSection("productionPreferences", "lightingStyle", v)} />
        <Field label="Equipment notes" value={value.productionPreferences?.equipmentNotes} onChange={(v) => setSection("productionPreferences", "equipmentNotes", v)} multiline />
      </Section>

      <Section title="Safety & compliance">
        <Field label="Prohibited topics" value={value.safety?.prohibitedTopics} onChange={(v) => setSection("safety", "prohibitedTopics", v)} multiline />
        <Field label="Content boundaries" value={value.safety?.contentBoundaries} onChange={(v) => setSection("safety", "contentBoundaries", v)} multiline />
        <Field label="Required disclaimers" value={value.safety?.requiredDisclaimers} onChange={(v) => setSection("safety", "requiredDisclaimers", v)} multiline />
      </Section>
    </div>
  );
}
