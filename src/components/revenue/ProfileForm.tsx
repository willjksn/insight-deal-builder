"use client";

import { useState } from "react";
import type {
  BusinessProfileFields,
  BusinessProfileStatus,
  BusinessProfileType,
} from "@/lib/revenueOpportunities/types/businessProfile";
import {
  PROFILE_FIELD_GROUPS,
  listToText,
  textToList,
  type ProfileFieldDef,
} from "@/lib/revenueOpportunities/profileFields";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export interface ProfileFormValue {
  name: string;
  profileType: BusinessProfileType;
  status: BusinessProfileStatus;
  fields: BusinessProfileFields;
}

const EMPTY: ProfileFormValue = {
  name: "",
  profileType: "img",
  status: "active",
  fields: {},
};

export function ProfileForm({
  initial,
  onSubmit,
  submitLabel = "Save profile",
  busy,
}: {
  initial?: ProfileFormValue;
  onSubmit: (value: ProfileFormValue) => Promise<void>;
  submitLabel?: string;
  busy?: boolean;
}) {
  const [form, setForm] = useState<ProfileFormValue>(initial ?? EMPTY);

  const setFields = (patch: Partial<BusinessProfileFields>) =>
    setForm((prev) => ({ ...prev, fields: { ...prev.fields, ...patch } }));

  const renderField = (def: ProfileFieldDef) => {
    const value = form.fields[def.key];

    if (def.kind === "boolean") {
      return (
        <label key={def.key} className="flex items-center gap-2 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400"
            checked={Boolean(value)}
            onChange={(e) => setFields({ [def.key]: e.target.checked } as Partial<BusinessProfileFields>)}
          />
          {def.label}
        </label>
      );
    }

    if (def.kind === "number") {
      return (
        <Input
          key={def.key}
          label={def.label}
          type="number"
          min={0}
          value={typeof value === "number" ? value : ""}
          onChange={(e) =>
            setFields({
              [def.key]: e.target.value === "" ? undefined : Number(e.target.value),
            } as Partial<BusinessProfileFields>)
          }
        />
      );
    }

    if (def.kind === "text") {
      return (
        <Input
          key={def.key}
          label={def.label}
          value={typeof value === "string" ? value : ""}
          placeholder={def.placeholder}
          onChange={(e) =>
            setFields({ [def.key]: e.target.value } as Partial<BusinessProfileFields>)
          }
        />
      );
    }

    // textarea + list both render as a Textarea; list serializes to lines.
    const isList = def.kind === "list";
    const textValue = isList
      ? listToText(Array.isArray(value) ? (value as string[]) : [])
      : typeof value === "string"
        ? value
        : "";

    return (
      <div key={def.key} className="md:col-span-2">
        <Textarea
          label={def.label}
          rows={isList ? 3 : 3}
          value={textValue}
          placeholder={def.placeholder}
          onChange={(e) =>
            setFields({
              [def.key]: isList ? textToList(e.target.value) : e.target.value,
            } as Partial<BusinessProfileFields>)
          }
        />
        {def.hint ? <p className="mt-1 text-xs text-slate-500">{def.hint}</p> : null}
      </div>
    );
  };

  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(form);
      }}
    >
      <Card>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Input
            label="Profile name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <Select
            label="Profile type"
            value={form.profileType}
            onChange={(e) =>
              setForm((p) => ({ ...p, profileType: e.target.value as BusinessProfileType }))
            }
            options={[
              { value: "img", label: "Insight Media Group (client work)" },
              { value: "stormi", label: "Stormi (brand partnerships)" },
              { value: "other", label: "Other" },
            ]}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) =>
              setForm((p) => ({ ...p, status: e.target.value as BusinessProfileStatus }))
            }
            options={[
              { value: "active", label: "Active" },
              { value: "draft", label: "Draft" },
              { value: "archived", label: "Archived" },
            ]}
          />
        </CardBody>
      </Card>

      {PROFILE_FIELD_GROUPS.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">{group.title}</h3>
            {group.description ? (
              <p className="text-sm text-slate-500">{group.description}</p>
            ) : null}
          </CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            {group.fields.map(renderField)}
          </CardBody>
        </Card>
      ))}

      <Button type="submit" size="touch" disabled={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}
