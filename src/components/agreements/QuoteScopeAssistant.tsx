"use client";

import { useState } from "react";
import { DollarSign, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardBody } from "@/components/ui/Card";
import { researchAgreementPricing, suggestAgreementScope } from "@/lib/agreement/apiClient";
import { PRICING_CATEGORY_LABELS, MarketPricingResearch } from "@/lib/agreement/pricingResearchTypes";
import { QuoteScopeSuggestion } from "@/lib/agreement/scopeSuggestTypes";
import { AgreementType } from "@/lib/types";

type Props = {
  agreementType: AgreementType;
  yourQuotedFee?: number;
  onApply: (suggestion: QuoteScopeSuggestion) => void;
  onApplySuggestedFee?: (fee: number) => void;
  disabled?: boolean;
};

function formatUsd(n: number): string {
  return `$${n.toLocaleString()}`;
}

export function QuoteScopeAssistant({
  agreementType,
  yourQuotedFee,
  onApply,
  onApplySuggestedFee,
  disabled,
}: Props) {
  const [jobDescription, setJobDescription] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("NC");
  const [zip, setZip] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [researching, setResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<QuoteScopeSuggestion | null>(null);
  const [pricing, setPricing] = useState<MarketPricingResearch | null>(null);

  const hasMarket = Boolean(city.trim() || zip.trim());

  const handleSuggest = async () => {
    if (!jobDescription.trim()) return;
    setSuggesting(true);
    setError(null);
    setSuggestion(null);
    try {
      const result = await suggestAgreementScope(jobDescription, agreementType);
      setSuggestion(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not suggest scope");
    } finally {
      setSuggesting(false);
    }
  };

  const handlePricingResearch = async () => {
    if (!jobDescription.trim() || !hasMarket) return;
    setResearching(true);
    setPricingError(null);
    setPricing(null);
    try {
      const result = await researchAgreementPricing({
        jobDescription,
        city: city.trim() || undefined,
        zip: zip.trim() || undefined,
        state: state.trim() || undefined,
        agreementType,
        yourQuotedFee,
      });
      setPricing(result);
    } catch (err) {
      setPricingError(err instanceof Error ? err.message : "Pricing research failed");
    } finally {
      setResearching(false);
    }
  };

  const suggestedMidFee = pricing
    ? Math.round((pricing.suggestedTotalFeeLow + pricing.suggestedTotalFeeHigh) / 2)
    : null;

  return (
    <Card className="mb-6 border-sky-200/80 bg-gradient-to-br from-sky-50/80 to-white">
      <CardBody className="space-y-6 p-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Describe the job</h2>
          <p className="mt-1 text-sm text-slate-600">
            AI suggests scope from your catalog, or researches market pricing by city/ZIP. You review
            and set every fee before sending.
          </p>
        </div>

        <Textarea
          label="Job description"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Example: 2-hour creator shoot for a local gym — 5 reels, 15 photos, one location, Insight gear, delivery in 7 days."
          rows={4}
          touch
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Charlotte"
            touch
          />
          <Input
            label="State"
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="NC"
            maxLength={2}
            touch
          />
          <Input
            label="ZIP (optional)"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="28202"
            inputMode="numeric"
            touch
          />
        </div>
        <p className="text-xs text-slate-500">
          Market pricing uses city and/or ZIP — change these when shooting outside North Carolina.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={disabled || suggesting || !jobDescription.trim()}
            onClick={() => void handleSuggest()}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {suggesting ? "Analyzing…" : "Suggest quote fields"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || researching || !jobDescription.trim() || !hasMarket}
            onClick={() => void handlePricingResearch()}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            {researching ? "Researching…" : "Research market pricing"}
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {pricingError && <p className="text-sm text-red-600">{pricingError}</p>}

        {pricing && (
          <div className="space-y-4 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-violet-950">
                  <DollarSign className="h-4 w-4" />
                  Market pricing — {pricing.marketArea}
                </p>
                <p className="mt-1 text-xs text-violet-800/80">
                  Suggested range only · Tavily + Gemini · {new Date(pricing.researchedAt).toLocaleString()}
                </p>
              </div>
              <p className="text-lg font-bold text-violet-950">
                {formatUsd(pricing.suggestedTotalFeeLow)} – {formatUsd(pricing.suggestedTotalFeeHigh)}
              </p>
            </div>

            <p className="text-sm text-slate-700">{pricing.summary}</p>

            {yourQuotedFee != null && yourQuotedFee > 0 && (
              <p className="rounded-lg bg-white/80 px-3 py-2 text-sm text-slate-700 ring-1 ring-violet-100">
                Your current wizard fee: <strong>{formatUsd(yourQuotedFee)}</strong>
                {yourQuotedFee < pricing.suggestedTotalFeeLow && (
                  <span className="text-amber-800"> — below the researched market band.</span>
                )}
                {yourQuotedFee > pricing.suggestedTotalFeeHigh && (
                  <span className="text-sky-800"> — above the researched market band.</span>
                )}
              </p>
            )}

            {pricing.comparisonNotes && (
              <p className="text-sm text-slate-600">{pricing.comparisonNotes}</p>
            )}

            {pricing.lineItems.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Line-item benchmarks</p>
                <ul className="mt-2 space-y-2">
                  {pricing.lineItems.map((item) => (
                    <li
                      key={`${item.category}-${item.label}`}
                      className="flex flex-wrap justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm ring-1 ring-violet-100"
                    >
                      <span>
                        <span className="text-slate-500">
                          {PRICING_CATEGORY_LABELS[item.category]} ·{" "}
                        </span>
                        {item.label}
                        {item.notes ? (
                          <span className="block text-xs text-slate-500">{item.notes}</span>
                        ) : null}
                      </span>
                      <span className="font-medium text-slate-800">
                        {formatUsd(item.lowUsd)} – {formatUsd(item.highUsd)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {pricing.competitiveNotes.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Stay competitive</p>
                <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
                  {pricing.competitiveNotes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            )}

            {pricing.cautions.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase text-amber-800">Watch for</p>
                <ul className="mt-1 list-inside list-disc text-sm text-amber-950/90">
                  {pricing.cautions.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            )}

            {onApplySuggestedFee && suggestedMidFee != null && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onApplySuggestedFee(suggestedMidFee)}
              >
                Use midpoint fee ({formatUsd(suggestedMidFee)}) in wizard
              </Button>
            )}
          </div>
        )}

        {suggestion && (
          <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <p className="text-sm text-emerald-950">{suggestion.rationale}</p>

            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Project</dt>
                <dd className="text-slate-800">{suggestion.projectName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Fee</dt>
                <dd className="text-slate-800">${suggestion.estimatedTotalFee.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Type</dt>
                <dd className="text-slate-800">{suggestion.projectType}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Package</dt>
                <dd className="text-slate-800">{suggestion.recommendedPackageName ?? "Custom scope"}</dd>
              </div>
            </dl>

            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Deliverables</p>
              <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
                {suggestion.deliverables.map((d) => (
                  <li key={`${d.name}-${d.quantity}`}>
                    {d.quantity}× {d.name}
                  </li>
                ))}
              </ul>
            </div>

            {suggestion.checklist.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Confirm before sending</p>
                <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
                  {suggestion.checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button type="button" onClick={() => onApply(suggestion)}>
              Apply to wizard
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
