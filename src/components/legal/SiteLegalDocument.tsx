"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { ContentPanel, PageSection } from "@/components/ui/PageSection";
import { APP_NAME } from "@/lib/brand";
import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";
import {
  LEGAL_LAST_UPDATED,
  SiteLegalDocument as SiteLegalDocumentType,
} from "@/lib/legal/siteLegalContent";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";
import { useAuth } from "@/contexts/AuthContext";
import { Scale } from "lucide-react";

export function SiteLegalDocument({
  document,
  showCrossLinks = true,
}: {
  document: SiteLegalDocumentType;
  showCrossLinks?: boolean;
}) {
  const { user } = useAuth();
  const legalPage = document.title === "Terms of Service" ? "terms" : "privacy";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={document.title}
        subtitle={`${document.subtitle} Last updated ${LEGAL_LAST_UPDATED}.`}
      />

      <PageSection
        icon={Scale}
        title={APP_NAME}
        description={`Operated by ${PRODUCER_LEGAL_NAME}`}
        accent="slate"
      >
        <ContentPanel className="space-y-8">
          {document.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-base font-semibold text-slate-900">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph.slice(0, 48)} className="mt-3 text-sm leading-relaxed text-slate-600">
                  {paragraph}
                </p>
              ))}
              {section.bullets?.length ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
                  {section.bullets.map((bullet) => (
                    <li key={bullet.slice(0, 48)}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </ContentPanel>
      </PageSection>

      {showCrossLinks ? (
        <p className="mt-6 text-center text-sm text-slate-500">
          See also{" "}
          <LegalFooterLinks
            className="inline-flex gap-3"
            linkClassName="font-medium text-sky-700 hover:text-sky-800"
            exclude={legalPage}
          />
        </p>
      ) : null}

      {!user ? (
        <p className="mt-4 text-center text-xs text-slate-400">
          <Link href="/login" className="hover:text-slate-600">
            Back to sign in
          </Link>
        </p>
      ) : null}
    </div>
  );
}
