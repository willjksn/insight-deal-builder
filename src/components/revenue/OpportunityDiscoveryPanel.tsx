"use client";

import { useEffect, useMemo, useState } from "react";
import type { DiscoveryQuestionNote, RevenueDiscoverySession } from "@/lib/revenueOpportunities/types/discovery";
import { resolveDiscoveryQuestionNotes, hasDiscoveryAnswers } from "@/lib/revenueOpportunities/discovery/callNotes";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { DISCOVERY_SESSION_STATUS_LABELS } from "@/lib/revenueOpportunities/labels";

export function OpportunityDiscoveryPanel({
  sessions,
  canManage,
  busy,
  onGeneratePrep,
  onSaveAnswers,
  onRunDebrief,
  onReload,
}: {
  sessions: RevenueDiscoverySession[];
  canManage: boolean;
  busy?: boolean;
  onGeneratePrep: () => Promise<void>;
  onSaveAnswers: (
    sessionId: string,
    payload: { callQuestionNotes: DiscoveryQuestionNote[]; additionalCallNotes?: string }
  ) => Promise<void>;
  onRunDebrief: (
    sessionId: string,
    payload: { callQuestionNotes: DiscoveryQuestionNote[]; additionalCallNotes?: string }
  ) => Promise<void>;
  onReload: () => Promise<void>;
}) {
  const latest = sessions[0];
  const initialQuestions = useMemo(
    () => resolveDiscoveryQuestionNotes(latest?.prepBrief, latest?.callQuestionNotes),
    [latest]
  );
  const [questionNotes, setQuestionNotes] = useState<DiscoveryQuestionNote[]>(initialQuestions);
  const [additionalNotes, setAdditionalNotes] = useState(latest?.additionalCallNotes ?? "");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setQuestionNotes(resolveDiscoveryQuestionNotes(latest?.prepBrief, latest?.callQuestionNotes));
    setAdditionalNotes(latest?.additionalCallNotes ?? "");
    setSaveMessage(null);
  }, [latest?.id, latest?.updatedAt, latest?.prepBrief, latest?.callQuestionNotes, latest?.additionalCallNotes]);

  const canDebrief = hasDiscoveryAnswers(questionNotes, additionalNotes);

  const updateAnswer = (id: string, answer: string) => {
    setQuestionNotes((prev) => prev.map((n) => (n.id === id ? { ...n, answer } : n)));
    setSaveMessage(null);
  };

  const handleSave = async () => {
    if (!latest) return;
    await onSaveAnswers(latest.id, {
      callQuestionNotes: questionNotes,
      additionalCallNotes: additionalNotes.trim() || undefined,
    });
    setSaveMessage("Answers saved");
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900">Discovery</h3>
        <p className="text-xs text-slate-500">
          Answer prep questions during the call, then run AI debrief for shoot goals and creative direction.
        </p>
      </CardHeader>
      <CardBody className="space-y-4 text-sm">
        {canManage && (
          <Button size="touch" variant="secondary" disabled={busy} onClick={onGeneratePrep}>
            Generate call prep
          </Button>
        )}

        {!latest && <p className="text-slate-600">No discovery session yet.</p>}

        {latest && (
          <>
            <div className="flex items-center gap-2">
              <Badge variant={latest.status === "completed" ? "success" : "info"}>
                {DISCOVERY_SESSION_STATUS_LABELS[latest.status]}
              </Badge>
            </div>

            {latest.prepBrief && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                <p className="mb-2 font-medium text-slate-900">Call prep</p>
                <p className="mb-3 text-slate-700">{latest.prepBrief.summary}</p>

                {latest.prepBrief.objectives.length > 0 && (
                  <div className="mb-3">
                    <p className="font-medium text-slate-800">Objectives</p>
                    <ul className="list-inside list-disc text-slate-600">
                      {latest.prepBrief.objectives.map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {questionNotes.length > 0 && (
                  <div className="space-y-3">
                    <p className="font-medium text-slate-800">Questions &amp; answers</p>
                    {questionNotes.map((item, index) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-slate-200/80 bg-white p-3 shadow-sm"
                      >
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                          Question {index + 1}
                        </p>
                        <p className="mb-2 font-medium text-slate-900">{item.question}</p>
                        {canManage && latest.status !== "completed" ? (
                          <Textarea
                            label="Their answer"
                            value={item.answer ?? ""}
                            onChange={(e) => updateAnswer(item.id, e.target.value)}
                            rows={2}
                            placeholder="Capture what they said..."
                            className="text-sm"
                          />
                        ) : (
                          <p className="whitespace-pre-wrap text-slate-700">
                            {item.answer?.trim() || "—"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {canManage && latest.status !== "completed" && (
              <>
                <Textarea
                  label="Additional call notes"
                  value={additionalNotes}
                  onChange={(e) => {
                    setAdditionalNotes(e.target.value);
                    setSaveMessage(null);
                  }}
                  rows={3}
                  placeholder="Anything else from the call — tone, stakeholders, side topics..."
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" disabled={busy} onClick={handleSave}>
                    Save answers
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy || !canDebrief}
                    onClick={() =>
                      onRunDebrief(latest.id, {
                        callQuestionNotes: questionNotes,
                        additionalCallNotes: additionalNotes.trim() || undefined,
                      })
                    }
                  >
                    Run AI debrief
                  </Button>
                  {saveMessage && <span className="text-xs text-emerald-700">{saveMessage}</span>}
                </div>
              </>
            )}

            {latest.debrief && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 space-y-3">
                <div>
                  <p className="mb-1 font-medium text-slate-900">Debrief</p>
                  <p className="text-slate-700">{latest.debrief.summary}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Fit: {latest.debrief.fitAssessment.replace(/_/g, " ")}
                  </p>
                </div>

                {latest.debrief.shootGoals && latest.debrief.shootGoals.length > 0 && (
                  <div>
                    <p className="font-medium text-slate-800">Shoot goals</p>
                    <ul className="list-inside list-disc text-slate-700">
                      {latest.debrief.shootGoals.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {latest.debrief.creativeMessage && (
                  <div>
                    <p className="font-medium text-slate-800">Creative message</p>
                    <p className="text-slate-700">{latest.debrief.creativeMessage}</p>
                  </div>
                )}

                {latest.debrief.scriptSeedNotes && (
                  <div>
                    <p className="font-medium text-slate-800">Script seed (for production)</p>
                    <p className="whitespace-pre-wrap text-slate-700">{latest.debrief.scriptSeedNotes}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {sessions.length > 0 && (
          <button type="button" className="text-xs text-sky-700 hover:underline" onClick={() => onReload()}>
            Refresh sessions
          </button>
        )}
      </CardBody>
    </Card>
  );
}
