"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { PayeeTaxInfo } from "@/lib/types";

interface PayeeTaxFieldsProps {
  tax: PayeeTaxInfo;
  onChange: (tax: PayeeTaxInfo) => void;
  legalNameLabel?: string;
}

export function PayeeTaxFields({
  tax,
  onChange,
  legalNameLabel = "Legal name (for 1099)",
}: PayeeTaxFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label={legalNameLabel}
          value={tax.legalName || ""}
          onChange={(e) => onChange({ ...tax, legalName: e.target.value })}
          touch
        />
        <Input
          label="Business name (if any)"
          value={tax.businessName || ""}
          onChange={(e) => onChange({ ...tax, businessName: e.target.value })}
          touch
        />
        <Input
          label="Mailing address"
          value={tax.mailingAddress || ""}
          onChange={(e) => onChange({ ...tax, mailingAddress: e.target.value })}
          className="md:col-span-2"
          touch
        />
        <Input label="City" value={tax.city || ""} onChange={(e) => onChange({ ...tax, city: e.target.value })} touch />
        <Input label="State" value={tax.state || ""} onChange={(e) => onChange({ ...tax, state: e.target.value })} touch />
        <Input label="ZIP" value={tax.zip || ""} onChange={(e) => onChange({ ...tax, zip: e.target.value })} touch />
        <Select
          label="Entity type"
          value={tax.entityType || "individual"}
          onChange={(e) => onChange({ ...tax, entityType: e.target.value as PayeeTaxInfo["entityType"] })}
          options={[
            { value: "individual", label: "Individual / sole proprietor" },
            { value: "llc", label: "LLC" },
            { value: "corporation", label: "Corporation" },
            { value: "partnership", label: "Partnership" },
          ]}
          touch
        />
        <Textarea
          label="Tax notes"
          value={tax.taxNotes || ""}
          onChange={(e) => onChange({ ...tax, taxNotes: e.target.value })}
          className="md:col-span-2"
          touch
        />
      </div>
    </div>
  );
}
