import type { Metadata } from "next";
import { ApplyLegalShell } from "@/components/creators/ApplyLegalShell";
import { CREATOR_APPLY_PRIVACY } from "@/lib/creators/applyLegalContent";

export const metadata: Metadata = {
  title: "Creator Network Application Privacy Notice — Insight Media Group",
  description: CREATOR_APPLY_PRIVACY.subtitle,
};

export default function CreatorApplyPrivacyPage() {
  return (
    <ApplyLegalShell
      document={CREATOR_APPLY_PRIVACY}
      otherHref="/apply/creators/terms"
      otherLabel="Application Terms"
    />
  );
}
