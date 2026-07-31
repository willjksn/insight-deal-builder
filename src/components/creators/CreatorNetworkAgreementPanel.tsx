"use client";

import { useState } from "react";
import { CheckCircle2, FileSignature } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CREATOR_NETWORK_AGREEMENT_VERSION } from "@/lib/creators/networkAgreementContent";
import type { CreatorNetworkAgreement } from "@/lib/creators/types";
import { downloadCreatorNetworkAgreementPdf } from "@/lib/pdf/generateCreatorNetworkAgreementPdf";
import { formatDateTime } from "@/lib/utils/format";

type Props = {
  agreement?: CreatorNetworkAgreement;
  creatorDisplayName?: string;
  canEdit: boolean;
  saving?: boolean;
  onVoid: () => Promise<void>;
};

export function CreatorNetworkAgreementPanel({
  agreement,
  creatorDisplayName,
  canEdit,
  saving,
  onVoid,
}: Props) {
  const [confirmVoid, setConfirmVoid] = useState(false);
  const current =
    agreement?.status === "signed" &&
    agreement.version === CREATOR_NETWORK_AGREEMENT_VERSION;
  const needsReSign =
    agreement?.status === "signed" &&
    agreement.version !== CREATOR_NETWORK_AGREEMENT_VERSION;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Network contractor agreement</h2>
          {current ? (
            <Badge variant="success">Signed</Badge>
          ) : agreement?.status === "voided" ? (
            <Badge variant="warning">Voided</Badge>
          ) : needsReSign ? (
            <Badge variant="warning">Re-sign needed</Badge>
          ) : (
            <Badge variant="default">Unsigned</Badge>
          )}
        </CardHeader>
        <CardBody className="space-y-3 text-sm text-slate-600">
          <p>
            Master independent-contractor MSA (v{CREATOR_NETWORK_AGREEMENT_VERSION}). Creators
            e-sign in the portal; no W-9 is collected as part of this flow.
          </p>
          {agreement?.status === "signed" || agreement?.status === "voided" ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
              <div className="flex items-start gap-2">
                {current ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <FileSignature className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                )}
                <div className="space-y-0.5">
                  <p className="font-medium text-slate-800">
                    {agreement.signerName || "—"}
                    {agreement.version ? ` · v${agreement.version}` : ""}
                  </p>
                  {agreement.signedAt ? (
                    <p>{formatDateTime(agreement.signedAt)}</p>
                  ) : null}
                  {agreement.signerEmail ? <p>{agreement.signerEmail}</p> : null}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-500">Creator has not signed yet.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCreatorNetworkAgreementPdf(agreement, {
                  creatorDisplayName: creatorDisplayName || agreement?.signerName,
                })
              }
            >
              Download PDF
            </Button>
            {canEdit && agreement?.status === "signed" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => setConfirmVoid(true)}
              >
                Void signature
              </Button>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmVoid}
        title="Void network agreement signature?"
        description="The creator will need to re-sign the current contractor agreement in the portal. Onboarding will mark the agreement item incomplete."
        confirmLabel="Void signature"
        onCancel={() => setConfirmVoid(false)}
        onConfirm={async () => {
          setConfirmVoid(false);
          await onVoid();
        }}
      />
    </>
  );
}
