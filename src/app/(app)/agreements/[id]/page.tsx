"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StickyActionBar } from "@/components/layout/WizardNav";
import { useDocument } from "@/hooks/useDocument";
import { useServicePackages } from "@/hooks/useServicePackages";
import { useMutations } from "@/hooks/useMutations";
import { downloadAgreementPdf } from "@/lib/pdf/generateAgreementPdf";
import { generateAgreementPreview } from "@/lib/agreement/preview";
import { calculateRentalSubtotal } from "@/lib/agreement/equipmentRental";
import {
  calculateLocationAgreementTotal,
  calculatePropsSubtotal,
  formatLocationKindLabel,
} from "@/lib/agreement/locationAgreement";
import { getExternalSigningParty, getSendToPartyLabel, canSendAgreementExternally } from "@/lib/agreement/payeeParties";
import { getAgreementTypeLabel } from "@/lib/agreement/wizardSteps";
import { canOpenInWizard, duplicateAgreement } from "@/lib/agreement/lifecycle";
import { formatDate } from "@/lib/utils/format";
import { useAuth } from "@/contexts/AuthContext";
import {
  canSignQuotes,
  canDownloadPdf,
  canEmailQuotes,
  canEditQuotes,
  canDuplicateQuotes,
} from "@/lib/utils/permissions";
import { Agreement, AgreementStatus } from "@/lib/types";
import { ArrowLeft, Download, PenLine, Pencil, Files, Send } from "lucide-react";
import { SendToClientPanel } from "@/components/agreements/SendToClientPanel";
import { PartyIdentitySection } from "@/components/identity/PartyIdentitySection";
import { PayeeW9Section } from "@/components/w9/PayeeW9Section";

export default function AgreementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { appUser } = useAuth();
  const { data: agreement, loading, refresh } = useDocument<Agreement>("agreements", id);
  const { data: servicePackages } = useServicePackages();
  const { create, update, saving } = useMutations("agreements");
  const [showSendPanel, setShowSendPanel] = useState(false);

  if (loading) return <LoadingSpinner className="py-20" />;
  if (!agreement) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Agreement not found.</p>
        <Link href="/agreements"><Button className="mt-4" variant="outline">Back</Button></Link>
      </div>
    );
  }

  const isLocked = agreement.status === "signed" || agreement.status === "completed";
  const canEditDraft = canEditQuotes(appUser) && canOpenInWizard(agreement.status);
  const externalSigningParty = getExternalSigningParty(agreement);
  const sendLabel = getSendToPartyLabel(agreement);
  const clientEmail = externalSigningParty?.email;
  const linkedPackage = agreement.servicePackageId
    ? servicePackages.find((p) => p.id === agreement.servicePackageId)
    : undefined;

  const canSendExternally =
    canEmailQuotes(appUser) &&
    externalSigningParty &&
    !isLocked &&
    canSendAgreementExternally(agreement);

  const handleDuplicate = async () => {
    if (!confirm("Create a new draft copy of this agreement?")) return;
    const payload = duplicateAgreement(agreement);
    const newId = await create(payload);
    router.push(`/agreements/new?id=${newId}`);
  };

  const handleStatusChange = async (status: AgreementStatus) => {
    await update(id, { status });
    refresh();
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "signed": case "completed": return "success" as const;
      case "partially_signed": case "ready_for_signature": return "warning" as const;
      case "void": return "danger" as const;
      default: return "default" as const;
    }
  };

  return (
    <div className="pb-32">
      <Link href="/agreements" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Agreements
      </Link>

      <PageHeader
        title={agreement.title}
        subtitle={`${getAgreementTypeLabel(agreement.agreementType)} · v${agreement.version}${linkedPackage ? ` · ${linkedPackage.name}` : ""}`}
        action={<Badge variant={statusVariant(agreement.status)}>{agreement.status.replace(/_/g, " ")}</Badge>}
      />

      {isLocked && (
        <div className="mb-4 rounded-lg bg-sky-50 border border-sky-200 p-3 text-sm text-sky-900">
          This agreement is locked. Use <strong>Duplicate</strong> to create a new version for edits.
        </div>
      )}

      {canEditQuotes(appUser) && !["void", "archived"].includes(agreement.status) && (
        <div className="mb-6 flex flex-wrap gap-2">
          {canDuplicateQuotes(appUser) && !isLocked && (
            <Button size="sm" variant="outline" onClick={handleDuplicate} disabled={saving}>
              Duplicate
            </Button>
          )}
          {agreement.status === "signed" && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange("completed")}>Mark completed</Button>
          )}
          {!isLocked && agreement.status !== "draft" && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange("draft")}>Revert to draft</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => { if (confirm("Archive this agreement?")) void handleStatusChange("archived"); }}>Archive</Button>
          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { if (confirm("Void this agreement?")) void handleStatusChange("void"); }}>Void</Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardBody className="space-y-4 text-sm">
          <h2 className="font-semibold text-lg">Project</h2>
          <Field label="Name" value={agreement.projectDetails.projectName} />
          <Field label="Type" value={`${agreement.projectDetails.projectType} · ${agreement.projectDetails.shootType}`} />
          <Field label="Shoot Date" value={formatDate(agreement.projectDetails.shootDate)} />
          <Field label="Location" value={agreement.projectDetails.location} />
          <Field label="Overview" value={agreement.projectDetails.projectOverview} />
        </CardBody></Card>

        <Card><CardBody className="space-y-4 text-sm">
          <h2 className="font-semibold text-lg">Terms</h2>
          <Field label="Payment" value={agreement.paymentTerms.paymentStructure} />
          <Field label="Total Fee" value={`$${agreement.paymentTerms.totalFee.toLocaleString()}`} />
          <Field label="Deliverables" value={agreement.deliverables.map((d) => `${d.quantity}x ${d.name}`).join(", ")} />
          {linkedPackage && <Field label="Package" value={`${linkedPackage.name} ($${linkedPackage.price.toLocaleString()})`} />}
          {agreement.payoutDetails && agreement.agreementType === "internal_collaboration" && (
            <Field label="Insight Payout" value={`$${(agreement.payoutDetails.insightFeeAmount || 0).toLocaleString()} (${agreement.payoutDetails.insightFeePercentage || 0}%)`} />
          )}
        </CardBody></Card>
      </div>

      {agreement.agreementType === "equipment_rental" && agreement.equipmentRentalDetails && (
        <Card className="mt-6"><CardBody className="space-y-3 text-sm">
          <h2 className="font-semibold text-lg">Equipment Schedule</h2>
          {agreement.equipmentRentalDetails.lineItems.length === 0 ? (
            <p className="text-slate-500">No equipment lines yet.</p>
          ) : (
            agreement.equipmentRentalDetails.lineItems.map((item) => (
              <div key={item.id} className="flex justify-between border-b border-slate-100 py-2">
                <span>{item.quantity}x {item.name} · ${item.dailyRate}/day × {item.days} days</span>
                <span className="font-medium">${item.lineTotal.toLocaleString()}</span>
              </div>
            ))
          )}
          <p className="font-semibold pt-2">
            Subtotal: ${calculateRentalSubtotal(agreement.equipmentRentalDetails.lineItems).toLocaleString()}
          </p>
        </CardBody></Card>
      )}

      {agreement.agreementType === "location_agreement" && agreement.locationAgreementDetails && (
        <Card className="mt-6"><CardBody className="space-y-3 text-sm">
          <h2 className="font-semibold text-lg">Location & Props</h2>
          <p className="text-slate-600">{formatLocationKindLabel(agreement.locationAgreementDetails.agreementKind)} · {agreement.locationAgreementDetails.propertyName}</p>
          {agreement.locationAgreementDetails.propertyAddress && (
            <p className="text-slate-500">{agreement.locationAgreementDetails.propertyAddress}</p>
          )}
          {agreement.locationAgreementDetails.propLineItems.length > 0 && (
            agreement.locationAgreementDetails.propLineItems.map((item) => (
              <div key={item.id} className="flex justify-between border-b border-slate-100 py-2">
                <span>{item.quantity}x {item.name} · ${item.dailyRate}/day × {item.days} days</span>
                <span className="font-medium">${item.lineTotal.toLocaleString()}</span>
              </div>
            ))
          )}
          {agreement.locationAgreementDetails.propLineItems.length > 0 && (
            <p className="text-slate-500">Props subtotal: ${calculatePropsSubtotal(agreement.locationAgreementDetails.propLineItems).toLocaleString()}</p>
          )}
          <p className="font-semibold pt-2">
            Total: ${calculateLocationAgreementTotal(agreement.locationAgreementDetails).toLocaleString()}
          </p>
        </CardBody></Card>
      )}

      <PartyIdentitySection agreement={agreement} agreementId={id} onUpdated={refresh} />
      <PayeeW9Section agreement={agreement} agreementId={id} onUpdated={refresh} />

      <Card className="mt-6"><CardBody>
        <h2 className="font-semibold text-lg mb-4">Agreement Preview</h2>
        <pre className="whitespace-pre-wrap text-sm font-sans text-slate-700 dark:text-slate-300">{generateAgreementPreview(agreement)}</pre>
      </CardBody></Card>

      {agreement.signatures.length > 0 && (
        <Card className="mt-6"><CardBody>
          <h2 className="font-semibold text-lg mb-4">Signatures</h2>
          {agreement.signatures.map((sig) => (
            <div key={sig.id} className="border rounded-lg p-4 mb-3 dark:border-slate-700">
              <p className="font-medium">{sig.signerName}{sig.signerTitle ? ` — ${sig.signerTitle}` : ""}</p>
              <p className="text-xs text-slate-500">{formatDate(sig.signedAt)}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sig.signatureDataUrl} alt="Signature" className="mt-2 h-16" />
            </div>
          ))}
        </CardBody></Card>
      )}

      <StickyActionBar>
        {canSendExternally && (
          <Button size="touch" onClick={() => setShowSendPanel(true)}>
            <Send className="mr-2 h-5 w-5" /> Send to {sendLabel}
          </Button>
        )}
        {canSignQuotes(appUser) && !isLocked && (
          <Link href={`/agreements/${id}/sign`}>
            <Button size="touch" variant={canSendExternally ? "secondary" : "primary"}>
              <PenLine className="mr-2 h-5 w-5" /> Sign
            </Button>
          </Link>
        )}
        {canEditDraft && (
          <Link href={`/agreements/new?id=${id}`}>
            <Button size="touch" variant="outline">
              <Pencil className="mr-2 h-5 w-5" /> Edit
            </Button>
          </Link>
        )}
        {canDownloadPdf(appUser) && (
          <Button size="touch" variant="outline" onClick={() => downloadAgreementPdf(agreement)}>
            <Download className="mr-2 h-5 w-5" /> PDF
          </Button>
        )}
        {canDuplicateQuotes(appUser) && isLocked && (
          <Button size="touch" variant="outline" onClick={handleDuplicate} disabled={saving}>
            <Files className="mr-2 h-5 w-5" /> Duplicate
          </Button>
        )}
      </StickyActionBar>

      {showSendPanel && externalSigningParty && (
        <SendToClientPanel
          agreement={agreement}
          agreementId={id}
          defaultEmail={clientEmail || ""}
          onClose={() => setShowSendPanel(false)}
          onSent={() => refresh()}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="whitespace-pre-wrap">{value || "—"}</p>
    </div>
  );
}
