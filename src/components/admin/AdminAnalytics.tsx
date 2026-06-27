"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Select } from "@/components/ui/Select";
import { InfoCallout, PageSection } from "@/components/ui/PageSection";
import { Badge } from "@/components/ui/Badge";
import { useAgreements } from "@/hooks/useAgreements";
import {
  AdminAnalyticsSnapshot,
  computeAdminAnalytics,
  formatUsd,
} from "@/lib/analytics/adminMetrics";
import { getAnalyticsYearOptions } from "@/lib/analytics/yearFilter";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  FileText,
  TrendingUp,
} from "lucide-react";

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: "emerald" | "sky" | "amber" | "rose" | "violet" | "slate";
}) {
  const styles = {
    emerald: "border-emerald-200/60 from-emerald-50 to-white ring-emerald-100",
    sky: "border-sky-200/60 from-sky-50 to-white ring-sky-100",
    amber: "border-amber-200/60 from-amber-50 to-white ring-amber-100",
    rose: "border-rose-200/60 from-rose-50 to-white ring-rose-100",
    violet: "border-violet-200/60 from-violet-50 to-white ring-violet-100",
    slate: "border-slate-200/80 from-slate-50 to-white ring-slate-100",
  };

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-4 shadow-md shadow-slate-200/30 ring-1 ${styles[accent]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-600">{sub}</p>}
    </div>
  );
}

function OutstandingTable({
  title,
  emptyLabel,
  lines,
  tone,
}: {
  title: string;
  emptyLabel: string;
  lines: AdminAnalyticsSnapshot["receivableLines"];
  tone: "in" | "out";
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 ring-1 ring-slate-100">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      {lines.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {lines.map((line) => (
            <li key={line.agreementId}>
              <Link
                href={`/agreements/${line.agreementId}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{line.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {line.counterparty} · {line.projectName}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-sm font-bold tabular-nums ${tone === "in" ? "text-emerald-700" : "text-rose-700"}`}
                  >
                    {formatUsd(line.outstanding)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {formatUsd(line.paid)} paid · {formatUsd(line.totalFee)} total
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface AdminAnalyticsProps {
  /** When set, omits admin-only wording (e.g. on /reports for accounting users). */
  variant?: "admin" | "reports";
}

export function AdminAnalytics({ variant = "admin" }: AdminAnalyticsProps) {
  const { data: agreements, loading } = useAgreements();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));

  const metrics = useMemo(
    () => computeAdminAnalytics(agreements, Number(year)),
    [agreements, year]
  );

  const yearOptions = getAnalyticsYearOptions(currentYear);
  const isReports = variant === "reports";

  return (
    <PageSection
      className="mb-8"
      icon={BarChart3}
      accent="emerald"
      title="Analytics"
      description={
        isReports
          ? "Revenue, cash flow, receivables, and payables for accounting"
          : "Revenue, cash flow, receivables, and payables — admin only"
      }
      action={
        <div className="w-32">
          <Select
            label=""
            value={year}
            onChange={(e) => setYear(e.target.value)}
            options={yearOptions}
            touch
          />
        </div>
      }
    >
      <InfoCallout variant="blue">
        Record payments on each signed agreement to keep cash and AR/AP accurate.{" "}
        <strong>Booked revenue</strong> counts deals signed in {year}.{" "}
        <strong>Cash collected and paid out</strong> use payment dates in {year} across all signed
        deals. <strong>Outstanding</strong> balances are current totals after recorded payments.
      </InfoCallout>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading agreement data…</p>
      ) : (
        <div className="mt-4 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              accent="emerald"
              label="Booked client revenue"
              value={formatUsd(metrics.bookedClientRevenue)}
              sub={`${metrics.signedClientCount} signed client deal${metrics.signedClientCount === 1 ? "" : "s"} in ${year}`}
            />
            <MetricCard
              accent="emerald"
              label="Cash collected"
              value={formatUsd(metrics.cashCollected)}
              sub={`Client payments recorded in ${year}`}
            />
            <MetricCard
              accent="sky"
              label="Outstanding receivables"
              value={formatUsd(metrics.outstandingReceivables)}
              sub="Client balances still due after recorded payments"
            />
            <MetricCard
              accent="amber"
              label="Client pipeline"
              value={formatUsd(metrics.clientPipeline)}
              sub={`${metrics.pipelineCount} open quote${metrics.pipelineCount === 1 ? "" : "s"} / unsigned`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              accent="violet"
              label="Deposits outstanding"
              value={formatUsd(metrics.scheduledDeposits)}
              sub="Unpaid deposit installments on signed client deals"
            />
            <MetricCard
              accent="rose"
              label="Payee obligations"
              value={formatUsd(metrics.payeeObligations)}
              sub={`${metrics.signedPayeeCount} signed talent / crew / rental / location`}
            />
            <MetricCard
              accent="rose"
              label="Cash paid out"
              value={formatUsd(metrics.cashPaidOut)}
              sub={`Payee + partner payouts recorded in ${year}`}
            />
            <MetricCard
              accent="rose"
              label="Outstanding payables"
              value={formatUsd(metrics.outstandingPayables)}
              sub="Payee balances still owed after recorded payments"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              accent="slate"
              label="Partner obligations"
              value={formatUsd(metrics.internalPartnerPayables)}
              sub={`${metrics.signedInternalCount} signed partner deal${metrics.signedInternalCount === 1 ? "" : "s"} (all years)`}
            />
            <MetricCard
              accent="violet"
              label="Partner payouts recorded"
              value={formatUsd(metrics.partnerCashPaidOut)}
              sub={`Collaborator payouts in ${year}`}
            />
            <MetricCard
              accent="slate"
              label="Outstanding partner payables"
              value={formatUsd(metrics.outstandingPartnerPayables)}
              sub="Collaborator splits still owed after recorded payouts"
            />
            <MetricCard
              accent="emerald"
              label="Est. net outstanding"
              value={formatUsd(metrics.estimatedNetOutstanding)}
              sub="Receivables minus payee & partner payables"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-1 max-w-md">
            <MetricCard
              accent="sky"
              label="Net cash ({year})"
              value={formatUsd(metrics.estimatedNetCash)}
              sub="Cash collected minus all cash paid out this year"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Badge variant="default">
              <FileText className="mr-1 inline h-3 w-3" />
              {metrics.draftCount} drafts
            </Badge>
            <Link
              href={`/reports/payments?year=${year}`}
              className="text-sm font-medium text-sky-700 hover:underline"
            >
              Open payment export →
            </Link>
            <Link
              href={`/reports/partners?year=${year}`}
              className="text-sm font-medium text-violet-700 hover:underline"
            >
              Partner payout export →
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <OutstandingTable
              title="Top outstanding receivables"
              emptyLabel="No outstanding client balances."
              lines={metrics.receivableLines}
              tone="in"
            />
            <OutstandingTable
              title="Top outstanding payables"
              emptyLabel="No outstanding payables."
              lines={metrics.payableLines}
              tone="out"
            />
            <OutstandingTable
              title="Top outstanding partner payables"
              emptyLabel="No outstanding partner payouts on signed deals."
              lines={metrics.partnerPayableLines}
              tone="out"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
              <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <span>
                <strong className="text-slate-900">Cash collected</strong> — client payments you
                recorded on signed deals (by payment date).
              </span>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
              <ArrowDownLeft className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
              <span>
                <strong className="text-slate-900">Receivables</strong> — client balances still due
                after subtracting recorded payments.
              </span>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
              <ArrowUpRight className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <span>
                <strong className="text-slate-900">Payables</strong> — amounts still owed to talent,
                contractors, locations, rentals, and internal collaborators after recorded payouts.
              </span>
            </div>
          </div>
        </div>
      )}
    </PageSection>
  );
}
