"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Agreement } from "@/lib/types";
import { agreementSupportsW9Upload, getPayeeTaxFromAgreement } from "@/lib/w9/payeeTax";
import { W9UploadField } from "@/components/w9/W9UploadField";
import { FileText } from "lucide-react";

interface PayeeW9SectionProps {
  agreement: Agreement;
  agreementId: string;
  onUpdated?: () => void;
}

export function PayeeW9Section({ agreement, agreementId, onUpdated }: PayeeW9SectionProps) {
  if (!agreementSupportsW9Upload(agreement.agreementType)) return null;

  const tax = getPayeeTaxFromAgreement(agreement);

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-sky-600" />
          <h2 className="text-lg font-semibold">W-9 Document</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Upload the payee&apos;s completed IRS Form W-9 for accountant export and 1099 prep.
        </p>
      </CardHeader>
      <CardBody>
        <W9UploadField agreementId={agreementId} tax={tax} onUploaded={onUpdated} />
      </CardBody>
    </Card>
  );
}
