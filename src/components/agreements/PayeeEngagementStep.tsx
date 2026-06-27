"use client";

import { AgreementPayload } from "@/lib/agreement/lifecycle";
import {
  ContractorAgreementDetails,
  CrewMember,
  TalentAgreementDetails,
} from "@/lib/types";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { PayeeTaxFields } from "@/components/agreements/PayeeTaxFields";
import {
  crewMemberToPayeeTax,
  syncContractorDetailsToPayment,
  syncTalentDetailsToPayment,
} from "@/lib/agreement/payeePartiesDefaults";

type PayeeMode = "talent" | "contractor";

interface PayeeEngagementStepProps {
  mode: PayeeMode;
  agreement: AgreementPayload;
  crew: CrewMember[];
  onChange: (patch: Partial<AgreementPayload>) => void;
  agreementId?: string | null;
  onW9Uploaded?: () => void;
}

export function PayeeEngagementStep({
  mode,
  agreement,
  crew,
  onChange,
  agreementId,
  onW9Uploaded,
}: PayeeEngagementStepProps) {
  const isTalent = mode === "talent";
  const talent = agreement.talentAgreementDetails;
  const contractor = agreement.contractorAgreementDetails;

  const updateTalent = (patch: Partial<TalentAgreementDetails>) => {
    if (!talent) return;
    const next = { ...talent, ...patch };
    onChange({
      talentAgreementDetails: next,
      paymentTerms: syncTalentDetailsToPayment({ ...agreement, talentAgreementDetails: next }),
    });
  };

  const updateContractor = (patch: Partial<ContractorAgreementDetails>) => {
    if (!contractor) return;
    const next = { ...contractor, ...patch };
    onChange({
      contractorAgreementDetails: next,
      paymentTerms: syncContractorDetailsToPayment({ ...agreement, contractorAgreementDetails: next }),
    });
  };

  return (
    <div className="space-y-6">
      {crew.length > 0 && (
        <Select
          label="Prefill from crew"
          value=""
          onChange={(e) => {
            const member = crew.find((c) => c.id === e.target.value);
            if (!member) return;
            const tax = crewMemberToPayeeTax(member);
            if (isTalent && talent) {
              updateTalent({
                feeAmount: member.defaultRate ?? talent.feeAmount,
                feeType: member.rateType === "hourly" ? "hourly" : member.rateType === "day" ? "day" : "flat",
                payeeTax: tax,
              });
            } else if (contractor) {
              updateContractor({
                contractorRole: member.defaultRole || contractor.contractorRole,
                feeAmount: member.defaultRate ?? contractor.feeAmount,
                feeType: member.rateType === "hourly" ? "hourly" : member.rateType === "day" ? "day" : "flat",
                payeeTax: tax,
              });
            }
          }}
          options={[{ value: "", label: "Select crew member..." }, ...crew.map((c) => ({ value: c.id, label: c.name }))]}
          touch
        />
      )}

      {isTalent && talent && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Talent role" value={talent.talentRole || ""} onChange={(e) => updateTalent({ talentRole: e.target.value })} touch />
            <Select label="Fee type" value={talent.feeType} onChange={(e) => updateTalent({ feeType: e.target.value as TalentAgreementDetails["feeType"] })} options={[{ value: "flat", label: "Flat" }, { value: "day", label: "Per day" }, { value: "hourly", label: "Hourly" }]} touch />
            <Input label="Fee amount ($)" type="number" min={0} value={talent.feeAmount} onChange={(e) => updateTalent({ feeAmount: Number(e.target.value) })} touch />
            <Input label="Shoot dates" value={talent.shootDates || ""} onChange={(e) => updateTalent({ shootDates: e.target.value })} touch />
            <Input label="Location" value={talent.location || ""} onChange={(e) => updateTalent({ location: e.target.value })} touch />
          </div>
          <Textarea label="Appearance / services" value={talent.appearanceDescription || ""} onChange={(e) => updateTalent({ appearanceDescription: e.target.value })} touch />
          <Textarea label="Usage scope" value={talent.usageScope || ""} onChange={(e) => updateTalent({ usageScope: e.target.value })} touch />
          <Card><CardBody>
            <h3 className="mb-4 font-semibold">Tax / W-9 info (for accountant export)</h3>
            <PayeeTaxFields
              tax={talent.payeeTax || {}}
              onChange={(payeeTax) => updateTalent({ payeeTax })}
              agreementId={agreementId || undefined}
              onW9Uploaded={onW9Uploaded}
            />
          </CardBody></Card>
        </>
      )}

      {!isTalent && contractor && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Role / title" value={contractor.contractorRole || ""} onChange={(e) => updateContractor({ contractorRole: e.target.value })} touch />
            <Select label="Fee type" value={contractor.feeType} onChange={(e) => updateContractor({ feeType: e.target.value as ContractorAgreementDetails["feeType"] })} options={[{ value: "flat", label: "Flat" }, { value: "day", label: "Per day" }, { value: "hourly", label: "Hourly" }]} touch />
            <Input label="Fee amount ($)" type="number" min={0} value={contractor.feeAmount} onChange={(e) => updateContractor({ feeAmount: Number(e.target.value) })} touch />
            <Input label="Service start" type="date" value={contractor.serviceStartDate || ""} onChange={(e) => updateContractor({ serviceStartDate: e.target.value })} touch />
            <Input label="Service end" type="date" value={contractor.serviceEndDate || ""} onChange={(e) => updateContractor({ serviceEndDate: e.target.value })} touch />
          </div>
          <Textarea label="Services description" value={contractor.servicesDescription || ""} onChange={(e) => updateContractor({ servicesDescription: e.target.value })} touch />
          <Card><CardBody>
            <h3 className="mb-4 font-semibold">Tax / W-9 info (for accountant export)</h3>
            <PayeeTaxFields
              tax={contractor.payeeTax || {}}
              onChange={(payeeTax) => updateContractor({ payeeTax })}
              agreementId={agreementId || undefined}
              onW9Uploaded={onW9Uploaded}
            />
          </CardBody></Card>
        </>
      )}
    </div>
  );
}
