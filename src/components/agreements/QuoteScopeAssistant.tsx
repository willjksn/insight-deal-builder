"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardBody } from "@/components/ui/Card";
import { suggestAgreementScope } from "@/lib/agreement/apiClient";
import { QuoteScopeSuggestion } from "@/lib/agreement/scopeSuggestTypes";
import { AgreementType } from "@/lib/types";

type Props = {
  agreementType: AgreementType;
  onApply: (suggestion: QuoteScopeSuggestion) => void;
  disabled?: boolean;
};

export function QuoteScopeAssistant({ agreementType, onApply, disabled }: Props) {
  const [jobDescription, setJobDescription] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<QuoteScopeSuggestion | null>(null);

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

  return (
    <Card className="mb-6 border-sky-200/80 bg-gradient-to-br from-sky-50/80 to-white">
      <CardBody className="space-y-4 p-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Describe the job</h2>
          <p className="mt-1 text-sm text-slate-600">
            AI suggests project type, deliverables, fee, and package fit from your catalog. You review and edit every
            field before sending.
          </p>
        </div>

        <Textarea
          label="Job description"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Example: 2-hour creator shoot for a local gym — 5 reels, 15 photos, one location, Insight gear, $1,500 budget, delivery in 7 days."
          rows={4}
          touch
        />

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
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

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
