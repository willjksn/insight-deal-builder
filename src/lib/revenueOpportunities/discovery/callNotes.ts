import type { DiscoveryPrepBrief, DiscoveryQuestionNote } from "@/lib/revenueOpportunities/types/discovery";

export function questionNotesFromPrep(questions: string[]): DiscoveryQuestionNote[] {
  return questions.map((question, index) => ({
    id: `q-${index}`,
    question,
  }));
}

/** Merge saved notes with prep questions when older sessions lack structured notes. */
export function resolveDiscoveryQuestionNotes(
  prepBrief: DiscoveryPrepBrief | undefined,
  saved?: DiscoveryQuestionNote[]
): DiscoveryQuestionNote[] {
  if (saved?.length) {
    const prepQuestions = prepBrief?.questionsToAsk ?? [];
    if (!prepQuestions.length) return saved;
    const byQuestion = new Map(saved.map((n) => [n.question.trim(), n]));
    return prepQuestions.map((question, index) => {
      const match = byQuestion.get(question.trim());
      return match ?? { id: `q-${index}`, question };
    });
  }
  if (prepBrief?.questionsToAsk.length) {
    return questionNotesFromPrep(prepBrief.questionsToAsk);
  }
  return [];
}

export function hasDiscoveryAnswers(
  questionNotes: DiscoveryQuestionNote[],
  additionalNotes?: string,
  legacyNotes?: string
): boolean {
  if (legacyNotes?.trim()) return true;
  if (additionalNotes?.trim()) return true;
  return questionNotes.some((n) => n.answer?.trim());
}

export function compileDiscoveryCallNotes(
  questionNotes: DiscoveryQuestionNote[],
  additionalNotes?: string
): string {
  const sections: string[] = [];
  const answered = questionNotes.filter((n) => n.answer?.trim());
  if (answered.length) {
    sections.push(
      "Discovery Q&A:",
      ...answered.map((n) => `Q: ${n.question}\nA: ${n.answer!.trim()}`)
    );
  }
  const extra = additionalNotes?.trim();
  if (extra) {
    sections.push("", "Additional call notes:", extra);
  }
  return sections.join("\n").trim();
}
