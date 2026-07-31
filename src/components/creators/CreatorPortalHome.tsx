"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getCreatorPortalMe, listCreatorPortalCampaigns } from "@/lib/creators/apiClient";
import { isPaymentDetailsComplete, type Creator } from "@/lib/creators/types";
import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";

export function CreatorPortalHome() {
  const { user } = useAuth();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [campaignCount, setCampaignCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        const [me, campaigns] = await Promise.all([
          getCreatorPortalMe(getToken),
          listCreatorPortalCampaigns(getToken),
        ]);
        if (cancelled) return;
        setCreator(me);
        setCampaignCount(campaigns.campaigns.length);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load portal");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getToken]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error ?? "Creator profile not linked. Use your invite link or contact IMG."}
      </div>
    );
  }

  const onboarding = creator.onboarding ?? [];
  const doneCount = onboarding.filter((t) => t.done).length;
  const remaining = onboarding.length - doneCount;
  const agreementSigned =
    creator.networkAgreement?.status === "signed" &&
    Boolean(creator.networkAgreement.version);
  const idStatus = creator.identityVerification?.status ?? "none";
  const paymentOk = isPaymentDetailsComplete(creator.paymentDetails);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Hi, {creator.professionalName}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Your {PRODUCER_LEGAL_NAME} creator portal on ShootSpine.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/creator-portal/profile" className="block">
          <Card className="h-full transition hover:border-sky-200 hover:shadow-md">
            <CardHeader>
              <h2 className="font-semibold text-slate-900">My profile</h2>
            </CardHeader>
            <CardBody className="text-sm text-slate-600">
              Update contact info, niche, and portfolio links.
            </CardBody>
          </Card>
        </Link>
        <Link href="/creator-portal/campaigns" className="block">
          <Card className="h-full transition hover:border-sky-200 hover:shadow-md">
            <CardHeader>
              <h2 className="font-semibold text-slate-900">My campaigns</h2>
            </CardHeader>
            <CardBody className="text-sm text-slate-600">
              {campaignCount === 0
                ? "No active assignments yet."
                : `${campaignCount} campaign${campaignCount === 1 ? "" : "s"} assigned to you.`}
            </CardBody>
          </Card>
        </Link>
        <Link href="/creator-portal/agreement" className="block">
          <Card className="h-full transition hover:border-sky-200 hover:shadow-md">
            <CardHeader>
              <h2 className="font-semibold text-slate-900">Agreement</h2>
            </CardHeader>
            <CardBody className="text-sm text-slate-600">
              {agreementSigned
                ? "Contractor agreement signed."
                : "Review and e-sign the independent contractor agreement."}
            </CardBody>
          </Card>
        </Link>
        <Link href="/creator-portal/identity" className="block">
          <Card className="h-full transition hover:border-sky-200 hover:shadow-md">
            <CardHeader>
              <h2 className="font-semibold text-slate-900">ID verification</h2>
            </CardHeader>
            <CardBody className="text-sm text-slate-600">
              {idStatus === "approved"
                ? "ID verified by IMG."
                : idStatus === "pending"
                  ? "ID submitted — awaiting staff review."
                  : idStatus === "rejected"
                    ? "ID needs resubmission."
                    : "Upload your government ID for staff review."}
            </CardBody>
          </Card>
        </Link>
        <Link href="/creator-portal/payment" className="block">
          <Card className="h-full transition hover:border-sky-200 hover:shadow-md">
            <CardHeader>
              <h2 className="font-semibold text-slate-900">Payment</h2>
            </CardHeader>
            <CardBody className="text-sm text-slate-600">
              {paymentOk
                ? "Payee details on file."
                : "Add how IMG should pay you as a contractor."}
            </CardBody>
          </Card>
        </Link>
        <Link href="/creator-portal/onboarding" className="block">
          <Card className="h-full transition hover:border-sky-200 hover:shadow-md">
            <CardHeader>
              <h2 className="font-semibold text-slate-900">Onboarding</h2>
            </CardHeader>
            <CardBody className="text-sm text-slate-600">
              {onboarding.length === 0
                ? "Checklist will appear when IMG starts onboarding."
                : remaining === 0
                  ? "All onboarding items complete."
                  : `${doneCount}/${onboarding.length} complete — ${remaining} remaining.`}
            </CardBody>
          </Card>
        </Link>
      </div>
    </div>
  );
}
