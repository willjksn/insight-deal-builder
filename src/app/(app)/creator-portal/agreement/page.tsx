"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileSignature } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  getCreatorPortalAgreement,
  signCreatorPortalAgreement,
} from "@/lib/creators/apiClient";
import type { CreatorAgreementDocument } from "@/lib/creators/networkAgreementContent";
import type { CreatorNetworkAgreement } from "@/lib/creators/types";
import { formatDateTime } from "@/lib/utils/format";

export default function CreatorPortalAgreementPage() {
  const { user } = useAuth();
  const [document, setDocument] = useState<CreatorAgreementDocument | null>(null);
  const [version, setVersion] = useState("");
  const [updated, setUpdated] = useState("");
  const [record, setRecord] = useState<CreatorNetworkAgreement | null>(null);
  const [needsSignature, setNeedsSignature] = useState(true);
  const [typedSignature, setTypedSignature] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCreatorPortalAgreement(getToken);
        if (cancelled) return;
        setDocument(data.document);
        setVersion(data.version);
        setUpdated(data.updated);
        setRecord(data.record ?? null);
        setNeedsSignature(data.needsSignature);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load agreement");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getToken]);

  const sign = async () => {
    setSigning(true);
    setError(null);
    try {
      const data = await signCreatorPortalAgreement(getToken, {
        typedSignature,
        accepted: true,
      });
      setRecord(data.record);
      setNeedsSignature(false);
      setAccepted(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign agreement");
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </div>
    );
  }

  if (!document) return null;

  const signedCurrent =
    !needsSignature && record?.status === "signed" && record.version === version;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/creator-portal"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to portal
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{document.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {document.subtitle} Version {version} · Updated {updated}.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {signedCurrent ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold">Signed</p>
            <p className="mt-0.5">
              {record?.signerName}
              {record?.signedAt ? ` · ${formatDateTime(record.signedAt)}` : ""}
              {record?.version ? ` · v${record.version}` : ""}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <FileSignature className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-semibold">Signature required</p>
            <p className="mt-0.5">
              Read the independent contractor agreement below, then type your legal name to
              sign. This is not employment — you remain a contractor.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Agreement terms</h2>
        </CardHeader>
        <CardBody className="max-h-[28rem] space-y-6 overflow-y-auto pr-1">
          {document.sections.map((section) => (
            <section key={section.title}>
              <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
              {section.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 56)}
                  className="mt-2 text-sm leading-relaxed text-slate-600"
                >
                  {paragraph}
                </p>
              ))}
              {section.bullets?.length ? (
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600">
                  {section.bullets.map((bullet) => (
                    <li key={bullet.slice(0, 56)}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </CardBody>
      </Card>

      {needsSignature ? (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Electronic signature</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              <span>
                I have read this Creator Network Independent Contractor Agreement and agree to
                be legally bound. I understand I am signing as an independent contractor, not
                as an employee.
              </span>
            </label>
            <Input
              label="Type your full legal name"
              value={typedSignature}
              onChange={(e) => setTypedSignature(e.target.value)}
              placeholder="Full legal name"
              autoComplete="name"
            />
            <Button
              type="button"
              size="touch"
              disabled={signing || !accepted || typedSignature.trim().length < 2}
              onClick={() => void sign()}
            >
              {signing ? "Signing…" : "Sign agreement"}
            </Button>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
