import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";

/** Bump when legal text materially changes — stored on applications. */
export const CREATOR_APPLY_LEGAL_VERSION = "2026-07-28";
export const CREATOR_APPLY_LEGAL_UPDATED = "July 28, 2026";

export const CREATOR_APPLY_CONTACT_EMAIL = "contact@insightmediagroupllc.com";
export const CREATOR_APPLY_PRIVACY_EMAIL = "contact@insightmediagroupllc.com";

const operator = PRODUCER_LEGAL_NAME;

export type ApplyLegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type ApplyLegalDocument = {
  title: string;
  subtitle: string;
  sections: ApplyLegalSection[];
};

/**
 * Terms for the public IMG Creator Network application
 * (https://shootspine.com/apply/creators) — not the full ShootSpine product Terms.
 */
export const CREATOR_APPLY_TERMS: ApplyLegalDocument = {
  title: "Creator Network Application Terms",
  subtitle: `These Terms govern your submission of an application to join the ${operator} Creator Network.`,
  sections: [
    {
      title: "1. Who we are",
      paragraphs: [
        `These Creator Network Application Terms ("Terms") are between you and ${operator}, a North Carolina limited liability company ("IMG," "we," "us," or "our"), with operations in Charlotte, North Carolina.`,
        "The application form is hosted on ShootSpine, a platform operated by IMG. Submitting an application does not create a ShootSpine user account and does not make you an IMG employee, contractor, agent, or talent until IMG separately engages you in writing.",
      ],
    },
    {
      title: "2. What you are applying for",
      paragraphs: [
        "By submitting this form, you ask IMG to consider you for its Creator Network — a roster of creators IMG may evaluate for brand partnerships, production work, UGC, campaigns, or related opportunities.",
        "Submission is not acceptance into the network. IMG may accept, decline, waitlist, request more information, invite you to interview, or take no action, for any lawful reason or no stated reason.",
        "If IMG later invites you to join, you may be asked to create a ShootSpine account and sign separate agreements (for example talent, contractor, or campaign terms). Those later agreements control any paid engagement.",
      ],
    },
    {
      title: "3. Eligibility",
      bullets: [
        "You must be at least 18 years old and able to form a binding contract.",
        "You must provide accurate, current information about yourself and your channels.",
        "You must have the right to share the links, portfolio materials, and personal information you submit.",
        "If you apply on behalf of a brand, agency, or minor you represent, you represent that you have authority to do so (applications for minors require a parent or legal guardian).",
      ],
    },
    {
      title: "4. Information you submit",
      paragraphs: [
        "You grant IMG a worldwide, non-exclusive, royalty-free license to use the information and materials you submit in the application — including your name, contact details, social links, portfolio URLs, niche, audience description, and written responses — solely to evaluate your application, communicate with you, operate the Creator Network intake process, and as described in the Creator Network Application Privacy Notice.",
        "You represent that your submission does not infringe others' rights and is not unlawful, misleading, or defamatory. Do not submit passwords, payment card numbers, government ID numbers, or other highly sensitive credentials through this form.",
      ],
    },
    {
      title: "5. No guarantee of work or compensation",
      paragraphs: [
        "Applying does not guarantee an interview, acceptance, campaign placement, compensation, or any volume of work. IMG does not promise exclusivity, preferred status, or specific rates unless agreed in a separate signed contract.",
        "Any rates, deliverables, usage rights, or payment terms for future work will be set only in a separate written agreement between you and IMG (and/or the brand client, as applicable).",
      ],
    },
    {
      title: "6. Communications",
      paragraphs: [
        "You agree that IMG may contact you at the email or phone number you provide about this application, interviews, next steps, and related Creator Network matters. You may ask us to stop application-related outreach by emailing the contact below; we may still retain your application record as described in the Privacy Notice.",
      ],
    },
    {
      title: "7. Conduct",
      bullets: [
        "Do not submit false, impersonating, or spam applications.",
        "Do not attempt to probe, scrape, overload, or disrupt the application form or related systems.",
        "Do not upload malware or harmful links.",
        "IMG may discard or block applications that violate these Terms.",
      ],
    },
    {
      title: "8. Relationship to other terms",
      paragraphs: [
        "These Terms apply only to the Creator Network application process. If you later create a ShootSpine account or sign production/talent agreements, those separate terms and policies will also apply to that use.",
        "IMG's marketing website at insightmediagroupllc.com may have its own site terms; for conflicts about this application form, these Terms control.",
      ],
    },
    {
      title: "9. Disclaimers and limitation of liability",
      paragraphs: [
        'THE APPLICATION FORM AND RELATED INTAKE PROCESS ARE PROVIDED "AS IS" AND "AS AVAILABLE." TO THE MAXIMUM EXTENT PERMITTED BY LAW, IMG DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
        "TO THE MAXIMUM EXTENT PERMITTED BY LAW, IMG WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST OPPORTUNITIES, ARISING FROM YOUR APPLICATION OR THESE TERMS. IMG'S TOTAL LIABILITY ARISING OUT OF YOUR APPLICATION SHALL NOT EXCEED ONE HUNDRED U.S. DOLLARS (US $100).",
        "Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the fullest extent permitted by law.",
      ],
    },
    {
      title: "10. Governing law",
      paragraphs: [
        "These Terms are governed by the laws of the State of North Carolina, without regard to conflict-of-law rules. Exclusive venue for disputes arising from these Terms or your application lies in the state or federal courts located in North Carolina, unless applicable law requires otherwise.",
      ],
    },
    {
      title: "11. Changes",
      paragraphs: [
        `We may update these Terms from time to time. The version date and legal version identifier (${CREATOR_APPLY_LEGAL_VERSION}) appear on this page. Material changes apply to applications submitted after the update. Continued submission of an application after changes are posted constitutes acceptance of the updated Terms.`,
      ],
    },
    {
      title: "12. Contact",
      paragraphs: [
        `Questions about these Terms: ${CREATOR_APPLY_CONTACT_EMAIL}`,
        `${operator} · Charlotte, NC`,
      ],
    },
  ],
};

/**
 * Privacy notice for the public IMG Creator Network application form.
 */
export const CREATOR_APPLY_PRIVACY: ApplyLegalDocument = {
  title: "Creator Network Application Privacy Notice",
  subtitle: `This notice explains how ${operator} collects, uses, and shares personal information when you apply to the Creator Network.`,
  sections: [
    {
      title: "1. Scope",
      paragraphs: [
        `This Privacy Notice applies to personal information you submit through the Creator Network application at shootspine.com/apply/creators (and related intake tools operated by ${operator} / "IMG," "we," "us").`,
        "It does not cover your use of a ShootSpine account after invitation, brand campaigns under separate contracts, or third-party sites you link to (Instagram, TikTok, etc.). Those services have their own policies.",
      ],
    },
    {
      title: "2. Information we collect",
      bullets: [
        "Identity and contact: name, email, phone, location/city or region.",
        "Professional profile: niche, portfolio/website URLs, social profile URLs, audience and content descriptions, and your written answers (including why you want to work with IMG).",
        "Referral / source information you choose to provide.",
        "Technical data related to submission: timestamp, approximate technical metadata needed to operate and secure the form (for example IP address or user agent may be logged by our hosting provider).",
        "We do not ask for Social Security numbers, payment cards, or government ID through this form — please do not send them here.",
      ],
    },
    {
      title: "3. How we use your information",
      bullets: [
        "Review and evaluate your application for the Creator Network.",
        "Contact you about status, interviews, missing information, or next steps.",
        "Maintain internal applicant records and prevent duplicate or abusive submissions.",
        "Improve our intake process and protect against fraud or security threats.",
        "Comply with law and enforce our Application Terms.",
        "If you are approved later, use the information as a starting point for your creator roster profile (you may be asked to update or expand it).",
      ],
    },
    {
      title: "4. Legal bases (where applicable)",
      paragraphs: [
        "Where required (for example under GDPR-style rules), we process application data based on: (a) steps at your request prior to a potential contract; (b) our legitimate interests in evaluating creators and running a production business; and/or (c) your consent where we ask for it. You may withdraw consent for optional marketing-style outreach, but we may still keep application records as needed for our legitimate interests and legal obligations.",
      ],
    },
    {
      title: "5. Sharing",
      paragraphs: [
        "We may share application information with:",
      ],
      bullets: [
        "IMG team members and contractors who need it to review applications (need-to-know).",
        "Service providers that host or operate ShootSpine / our infrastructure (for example cloud hosting and email), under obligations to protect data.",
        "Professional advisors or authorities when required by law, or to protect rights, safety, and security.",
        "We do not sell your personal information. We do not share application data with brand clients for their marketing lists solely because you applied — any later campaign introductions happen only if you progress in our process and agree to relevant terms.",
      ],
    },
    {
      title: "6. Retention",
      paragraphs: [
        "We keep application records for as long as reasonably needed to evaluate candidates, maintain a record of prior applicants, resolve disputes, and meet legal obligations. If you are rejected or withdraw, we may retain a limited record to avoid repeat processing and document our decision process. You may request deletion as described below; we will honor requests where legally required, subject to retention needed for legitimate business or legal purposes.",
      ],
    },
    {
      title: "7. Security",
      paragraphs: [
        "We use administrative and technical safeguards appropriate to the nature of application data. No method of transmission or storage is completely secure; please use a private device when submitting sensitive contact details.",
      ],
    },
    {
      title: "8. Your choices and rights",
      bullets: [
        "You may request access, correction, or deletion of your application information by emailing us.",
        "You may ask us to stop contacting you about this application (except notices we must send for legal or security reasons).",
        "Depending on your location, you may have additional rights (for example under CCPA/CPRA or GDPR). We will respond as required by applicable law.",
        `Contact: ${CREATOR_APPLY_PRIVACY_EMAIL}`,
      ],
    },
    {
      title: "9. Children",
      paragraphs: [
        "The Creator Network application is intended for adults 18+. We do not knowingly collect application data from children under 13. If you believe a child submitted an application, contact us and we will delete it.",
      ],
    },
    {
      title: "10. International transfers",
      paragraphs: [
        "IMG is based in the United States. If you apply from outside the U.S., your information will be processed in the United States, which may have different data-protection rules than your country.",
      ],
    },
    {
      title: "11. Changes",
      paragraphs: [
        `We may update this Privacy Notice. The version date and identifier (${CREATOR_APPLY_LEGAL_VERSION}) appear on this page. Material changes apply to information collected after the update is posted.`,
      ],
    },
    {
      title: "12. Contact",
      paragraphs: [
        `Privacy questions: ${CREATOR_APPLY_PRIVACY_EMAIL}`,
        `${operator} · Charlotte, NC`,
      ],
    },
  ],
};
