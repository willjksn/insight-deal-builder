"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AgreementSigningFlow } from "@/components/signatures/AgreementSigningFlow";
import { StickyActionBar } from "@/components/layout/WizardNav";
import { useDocument } from "@/hooks/useDocument";
import { useMutations } from "@/hooks/useMutations";
import { downloadAgreementPdf } from "@/lib/pdf/generateAgreementPdf";
import { SendToClientPanel } from "@/components/agreements/SendToClientPanel";
import {
  getExternalSigningParty,
  getSendToPartyLabel,
  canSendAgreementExternally,
} from "@/lib/agreement/payeeParties";
import { upsertPartyInitials } from "@/lib/agreement/signing";
import { uploadStaffIdentityCapture } from "@/lib/identity/client";
import { isPartyIdentityComplete, partyRequiresIdVerification } from "@/lib/identity/verification";
import { triggerClientSignedNotifications } from "@/lib/agreement/notifyClientSigned";
import { useAuth } from "@/contexts/AuthContext";
import { canEmailQuotes, canSignQuotes } from "@/lib/utils/permissions";
import { Agreement, SignatureRecord } from "@/lib/types";
import { ArrowLeft, Download, Send, CheckCircle } from "lucide-react";

export default function SignAgreementPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: agreement, loading, refresh } = useDocument<Agreement>("agreements", id);
  const { update, saving } = useMutations("agreements");
  const { appUser } = useAuth();

  const [partyId, setPartyId] = useState("");
  const [showSendPanel, setShowSendPanel] = useState(false);
  const [sendNotice, setSendNotice] = useState<string | null>(null);

  useEffect(() => {
    setPartyId("");
  }, [id]);

  const selectedParty = agreement?.parties.find((p) => p.id === partyId);
  const isLocked = agreement?.status === "signed" || agreement?.status === "completed";
  const externalSigningParty = agreement ? getExternalSigningParty(agreement) : undefined;
  const sendLabel = agreement ? getSendToPartyLabel(agreement) : "client";
  const clientEmail = externalSigningParty?.email;
  const canSendExternally =
    !!agreement &&
    canEmailQuotes(appUser) &&
    !!externalSigningParty &&
    !isLocked &&
    canSendAgreementExternally(agreement);

  if (loading) return <LoadingSpinner className="py-20" />;
  if (!agreement) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Agreement not found.</p>
        <Link href="/agreements"><Button className="mt-4" variant="outline">Back</Button></Link>
      </div>
    );
  }

  if (!canSignQuotes(appUser)) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold">Signing not enabled</h2>
        <p className="mt-2 text-slate-500">Your account needs the Sign quotes permission to capture signatures.</p>
        <Link href={`/agreements/${id}`}><Button className="mt-6" variant="outline">View Agreement</Button></Link>
      </div>
    );
  }

  const persistInitial = async (clauseId: string, initialsDataUrl: string) => {
    if (!selectedParty) return;
    const initials = upsertPartyInitials(agreement.initials, selectedParty.id, [clauseId], initialsDataUrl);
    await update(id, { initials });
    await refresh();
    return { initials };
  };

  const persistSignature = async (signatureDataUrl: string) => {
    if (!selectedParty) return;
    if (
      partyRequiresIdVerification(agreement, selectedParty) &&
      !isPartyIdentityComplete(agreement, selectedParty.id)
    ) {
      alert("Government ID (front and back) is required before signing.");
      return;
    }
    const hadSignature = agreement.signatures.some((s) => s.partyId === selectedParty.id);
    const sig: SignatureRecord = {
      id: crypto.randomUUID(),
      partyId: selectedParty.id,
      signerName: selectedParty.signerName,
      signerTitle: selectedParty.signerTitle,
      signatureDataUrl,
      signedAt: new Date().toISOString(),
      email: selectedParty.email,
      agreedToElectronicSignature: true,
    };
    const signatures = [...agreement.signatures.filter((s) => s.partyId !== selectedParty.id), sig];
    const requiredSigs = agreement.parties.filter((p) => p.signatureRequired);
    const allSigned = requiredSigs.every((p) => signatures.some((s) => s.partyId === p.id));
    const status = allSigned ? "signed" : signatures.length > 0 ? "partially_signed" : agreement.status;
    await update(id, { signatures, status });

    if (!hadSignature && selectedParty.type === "client") {
      try {
        await triggerClientSignedNotifications(id, selectedParty.id);
      } catch (err) {
        console.error("Failed to send sign notifications:", err);
      }
    }

    await refresh();
    return { signatures };
  };

  const persistIdentity = async (idFrontDataUrl: string, idBackDataUrl: string, consentGiven: boolean) => {
    if (!selectedParty) return;
    await uploadStaffIdentityCapture(id, selectedParty.id, idFrontDataUrl, idBackDataUrl, consentGiven);
    await refresh();
    return { identityVerifications: agreement.identityVerifications };
  };

  return (
    <div className="pb-36">
      <Link href={`/agreements/${id}`} className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Agreement
      </Link>

      <PageHeader title="Sign Agreement" subtitle={agreement.title} />

      {sendNotice && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {sendNotice}
        </div>
      )}

      {isLocked && (
        <div className="mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 p-3 text-sm text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle className="h-5 w-5" /> Agreement fully signed and locked.
        </div>
      )}

      <Card className="mb-6">
        <CardBody>
          <Select
            label="Signing Party"
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            options={[
              { value: "", label: "Select party..." },
              ...agreement.parties.map((p) => ({
                value: p.id,
                label: `${p.signerName} (${p.roleInAgreement})`,
              })),
            ]}
            touch
          />
        </CardBody>
      </Card>

      {selectedParty && (
        <AgreementSigningFlow
          key={selectedParty.id}
          agreement={agreement}
          party={selectedParty}
          isLocked={isLocked}
          saving={saving}
          onPersistInitial={persistInitial}
          onPersistSignature={persistSignature}
          onPersistIdentity={persistIdentity}
        />
      )}

      <StickyActionBar>
        {canSendExternally && (
          <Button size="touch" onClick={() => setShowSendPanel(true)}>
            <Send className="mr-2 h-5 w-5" /> Send to {sendLabel}
          </Button>
        )}
        <Button size="touch" variant="secondary" onClick={() => downloadAgreementPdf(agreement)}>
          <Download className="mr-2 h-5 w-5" /> Download PDF
        </Button>
        <Button size="touch" onClick={() => router.push(`/agreements/${id}`)} disabled={saving}>
          Done
        </Button>
      </StickyActionBar>

      {showSendPanel && externalSigningParty && (
        <SendToClientPanel
          agreement={agreement}
          agreementId={id}
          defaultEmail={clientEmail || ""}
          onClose={() => setShowSendPanel(false)}
          onSent={(result) => {
            refresh();
            setSendNotice(`Agreement sent to ${result.to}. The client can sign from the email link.`);
          }}
        />
      )}
    </div>
  );
}
