"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, IdCard, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  getCreatorPortalIdentity,
  submitCreatorPortalIdentity,
} from "@/lib/creators/apiClient";
import type { CreatorIdentityVerification } from "@/lib/creators/types";
import { formatDateTime } from "@/lib/utils/format";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function CreatorPortalIdentityPage() {
  const { user } = useAuth();
  const [verification, setVerification] = useState<CreatorIdentityVerification | null>(null);
  const [canUpload, setCanUpload] = useState(false);
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  const reload = useCallback(async () => {
    const data = await getCreatorPortalIdentity(getToken);
    setVerification(data.verification);
    setCanUpload(data.canUpload);
  }, [getToken]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await reload();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load ID verification");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, reload]);

  const submit = async () => {
    if (!front) {
      setError("Upload the front of your government ID.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const frontFileDataUrl = await fileToDataUrl(front);
      const backFileDataUrl = back ? await fileToDataUrl(back) : undefined;
      const data = await submitCreatorPortalIdentity(getToken, {
        frontFileDataUrl,
        frontFileName: front.name,
        backFileDataUrl,
        backFileName: back?.name,
      });
      setVerification(data.verification);
      setCanUpload(data.canUpload);
      setFront(null);
      setBack(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit ID");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  const status = verification?.status ?? "none";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/creator-portal"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to portal
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">ID verification</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload a clear photo or scan of your government-issued ID. IMG staff will review it
          before marking onboarding complete.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {status === "approved" ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold">Verified</p>
            <p className="mt-0.5">
              {verification?.reviewedAt
                ? `Approved ${formatDateTime(verification.reviewedAt)}`
                : "Your ID has been approved by IMG."}
            </p>
          </div>
        </div>
      ) : null}

      {status === "pending" ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-semibold">Awaiting review</p>
            <p className="mt-0.5">
              Submitted
              {verification?.submittedAt ? ` ${formatDateTime(verification.submittedAt)}` : ""}.
              IMG will verify your ID shortly.
            </p>
          </div>
        </div>
      ) : null}

      {status === "rejected" ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold">Needs resubmission</p>
            <p className="mt-0.5">
              {verification?.rejectionReason ||
                "Your ID was not accepted. Please upload a clearer copy."}
            </p>
          </div>
        </div>
      ) : null}

      {status === "none" ? (
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <IdCard className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
          <p>Driver’s license, passport, or state ID. Front required; back optional.</p>
        </div>
      ) : null}

      {canUpload ? (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Upload ID</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Front (required)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="block w-full text-sm text-slate-600"
                onChange={(e) => setFront(e.target.files?.[0] ?? null)}
              />
              {front ? (
                <p className="mt-1 text-xs text-slate-500">{front.name}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Back (optional)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="block w-full text-sm text-slate-600"
                onChange={(e) => setBack(e.target.files?.[0] ?? null)}
              />
              {back ? <p className="mt-1 text-xs text-slate-500">{back.name}</p> : null}
            </div>
            <p className="text-xs text-slate-500">
              Max 12 MB per file. Stored securely and only visible to authorized IMG staff.
            </p>
            <Button
              type="button"
              size="touch"
              disabled={submitting || !front}
              onClick={() => void submit()}
            >
              {submitting ? "Submitting…" : "Submit for review"}
            </Button>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
