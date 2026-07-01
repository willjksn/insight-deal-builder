"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Agreement } from "@/lib/types";
import { downloadAgreementPdf } from "@/lib/pdf/generateAgreementPdf";
import { buildClientAgreementSendEmail, copyToClipboard, getMailtoLink } from "@/lib/email/agreementEmail";
import { sendAgreementToClient } from "@/lib/email/sendClient";
import { formatDate } from "@/lib/utils/format";
import { createClientSigningLink } from "@/lib/signing/client";
import { CheckCircle, Copy, Download, Mail, Send, X } from "lucide-react";

interface SendToClientPanelProps {
  agreement: Agreement;
  agreementId: string;
  defaultEmail?: string;
  onClose: () => void;
  onSent?: () => void;
}

export function SendToClientPanel({
  agreement,
  agreementId,
  defaultEmail = "",
  onClose,
  onSent,
}: SendToClientPanelProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    signingUrl: string;
    expiresAt: string;
    to: string;
    resendEmailId?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      setError("Enter the client's email address.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const result = await sendAgreementToClient(agreementId, email.trim());
      setSuccess({
        signingUrl: result.signingUrl,
        expiresAt: result.expiresAt,
        to: result.to,
        resendEmailId: result.resendEmailId,
      });
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const handleCopyFallback = async () => {
    try {
      const signingParty =
        agreement.parties.find((p) => p.type === "client") ||
        agreement.parties.find((p) => p.roleInAgreement === "Renter");
      if (!signingParty) throw new Error("No signing party found");
      const { url, expiresAt } = await createClientSigningLink(
        agreementId,
        signingParty.id
      );
      const content = buildClientAgreementSendEmail({
        agreement,
        signingUrl: url,
        expiresAt: formatDate(expiresAt),
      });
      const ok = await copyToClipboard(`Subject: ${content.subject}\n\n${content.text}`);
      setCopied(ok);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not copy email");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Send to client</h2>
            <p className="mt-1 text-sm text-slate-500">
              Sends the agreement PDF and a secure signing link from notifications@shootspine.com.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardBody className="space-y-4">
          {success ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Sent to {success.to}</p>
                  {success.resendEmailId && (
                    <p className="mt-1 text-xs text-emerald-700">
                      Resend ID: {success.resendEmailId}
                    </p>
                  )}
                  <p className="mt-1 text-emerald-800">
                    Signing link expires {formatDate(success.expiresAt)}.
                  </p>
                </div>
              </div>
              <Input label="Signing link" value={success.signingUrl} readOnly touch />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(success.signingUrl)}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy link
                </Button>
                <Button size="sm" onClick={onClose}>Done</Button>
              </div>
            </div>
          ) : (
            <>
              <Input
                label="Client email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                touch
              />

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button size="touch" onClick={handleSend} disabled={sending} className="flex-1">
                  <Send className="mr-2 h-5 w-5" />
                  {sending ? "Sending…" : "Send email + PDF"}
                </Button>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Manual fallback (does not send from ShootSpine)
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => downloadAgreementPdf(agreement)}>
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCopyFallback}>
                    <Copy className="mr-2 h-4 w-4" /> {copied ? "Copied!" : "Copy email + link"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { window.location.href = getMailtoLink(agreement, email || undefined); }}
                  >
                    <Mail className="mr-2 h-4 w-4" /> Open in mail app
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
