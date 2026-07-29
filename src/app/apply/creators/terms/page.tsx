import type { Metadata } from "next";
import { ApplyLegalShell } from "@/components/creators/ApplyLegalShell";
import { CREATOR_APPLY_TERMS } from "@/lib/creators/applyLegalContent";

export const metadata: Metadata = {
  title: "Creator Network Application Terms — Insight Media Group",
  description: CREATOR_APPLY_TERMS.subtitle,
};

export default function CreatorApplyTermsPage() {
  return (
    <ApplyLegalShell
      document={CREATOR_APPLY_TERMS}
      otherHref="/apply/creators/privacy"
      otherLabel="Privacy Notice"
    />
  );
}
