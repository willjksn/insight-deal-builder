"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";

export function PaySuccessContent() {
  const searchParams = useSearchParams();
  const agreementId = searchParams.get("agreementId");
  const sessionId = searchParams.get("session_id");

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center bg-slate-50 px-4 py-10">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Payment received</h1>
        <p className="mt-2 text-sm text-slate-600">
          Thank you. {PRODUCER_LEGAL_NAME} will confirm your payment shortly
          {sessionId ? " and update your agreement record." : "."}
        </p>
        {agreementId ? (
          <Link href={`/agreements/${agreementId}`} className="mt-6 inline-block">
            <Button variant="outline">View agreement</Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
