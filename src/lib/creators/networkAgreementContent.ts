import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";

/**
 * Creator Network Independent Contractor Agreement (master MSA).
 * Bump version when text materially changes — signed creators may need to re-sign.
 * Have licensed counsel review before relying on these terms in live engagements.
 */
export const CREATOR_NETWORK_AGREEMENT_VERSION = "2026-07-29";
export const CREATOR_NETWORK_AGREEMENT_UPDATED = "July 29, 2026";
export const CREATOR_NETWORK_AGREEMENT_CONTACT = "contact@insightmediagroupllc.com";

/** Client-safe: true when creator must sign (or re-sign) the current MSA version. */
export function networkAgreementNeedsSignature(record?: {
  status?: string;
  version?: string;
} | null): boolean {
  if (!record || record.status !== "signed") return true;
  return record.version !== CREATOR_NETWORK_AGREEMENT_VERSION;
}

const company = PRODUCER_LEGAL_NAME;

export type CreatorAgreementSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type CreatorAgreementDocument = {
  title: string;
  subtitle: string;
  sections: CreatorAgreementSection[];
};

export const CREATOR_NETWORK_AGREEMENT: CreatorAgreementDocument = {
  title: "Creator Network Independent Contractor Agreement",
  subtitle: `This Agreement governs your participation in the ${company} Creator Network as an independent contractor (not an employee).`,
  sections: [
    {
      title: "1. Parties and effective date",
      paragraphs: [
        `This Creator Network Independent Contractor Agreement ("Agreement") is between you ("Creator," "you," or "your") and ${company}, a North Carolina limited liability company ("IMG," "we," "us," or "our").`,
        "This Agreement becomes effective on the date you electronically sign it in ShootSpine (the \"Effective Date\"). By signing, you confirm you have read and understand this Agreement and intend to be legally bound.",
      ],
    },
    {
      title: "2. Independent contractor — not employment",
      paragraphs: [
        "You are an independent contractor and not an employee, partner, joint venturer, or agent of IMG. Nothing in this Agreement creates an employment relationship under federal or North Carolina law.",
        "You control the manner and means of performing your creative services, subject to campaign briefs, brand-safety rules, and lawful direction for specific engagements. You are free to provide services to others, except where a written campaign engagement imposes a limited exclusivity period.",
        "IMG will not provide employee benefits, unemployment insurance, workers' compensation coverage for you as an employee, or withhold employment taxes from amounts paid to you under this Agreement.",
        "You are solely responsible for all taxes, licenses, insurance, and business expenses arising from compensation paid under this Agreement or any campaign engagement. IMG may issue IRS Form 1099 or other tax reporting as required by law. You agree to provide accurate payee and tax identification information when IMG reasonably requests it for payment or legal compliance.",
      ],
    },
    {
      title: "3. Network membership — no guaranteed work",
      paragraphs: [
        "Acceptance into the Creator Network and signing this Agreement do not guarantee any volume of work, interviews, campaign placements, minimum fees, preferred status, or exclusivity with IMG or its clients.",
        "IMG may invite you to specific opportunities in its discretion. Each paid engagement will be confirmed in writing (for example a campaign brief, statement of work, ShootSpine assignment, or separate talent/contractor deal) stating fees, deliverables, dates, usage, and other terms for that engagement (an \"Engagement\").",
        "If an Engagement conflicts with this Agreement, the Engagement controls for that Engagement only. This Agreement remains the master terms for network membership and default rules.",
      ],
    },
    {
      title: "4. Creator services and professionalism",
      bullets: [
        "Perform Engagements professionally, on time, and consistent with the approved brief, brand guidelines, and platform policies.",
        "Disclose material conflicts of interest, competing brand deals, or exclusivity that could affect an Engagement before accepting it.",
        "Maintain accurate profile, rates, availability, and contact information in ShootSpine.",
        "Do not misrepresent follower counts, engagement, audience demographics, or prior work.",
        "Comply with FTC endorsement guides and all required advertising disclosures (#ad, #sponsored, or equivalent) on every paid post.",
        "Do not post illegal, defamatory, hateful, or knowingly false content in connection with IMG or its clients.",
      ],
    },
    {
      title: "5. Compensation and payment",
      paragraphs: [
        "Fees, payment schedule, expenses, and kill fees (if any) are set only in the applicable Engagement. IMG has no obligation to pay for unsolicited work or work performed without a confirmed Engagement.",
        "Unless an Engagement states otherwise, payment is due after IMG (and the brand, if applicable) accepts deliverables and any required usage rights are cleared. IMG may withhold payment for incomplete, late, non-conforming, or undisclosed conflicted work until cured.",
        "You authorize IMG to pay the payee details on file. You must promptly update banking or payment information. Failed payments caused by incorrect details are your responsibility.",
      ],
    },
    {
      title: "6. Deliverables, approval, and revisions",
      paragraphs: [
        "Deliverables must match the Engagement brief (concept, length, format, platform, captions, tags, disclosures, and deadlines). IMG or the brand may require a reasonable number of revision rounds stated in the Engagement.",
        "If you miss a deadline without IMG's written approval, IMG may reduce the fee, cancel the Engagement, reassign the work, and/or recover reasonably incurred substitute costs, to the extent permitted by the Engagement and applicable law.",
        "You will not publish Engagement content until IMG or the brand gives written approval when approval is required by the Engagement.",
      ],
    },
    {
      title: "7. Intellectual property, likeness, and usage",
      paragraphs: [
        "Unless an Engagement expressly states otherwise: (a) you retain ownership of your pre-existing content, tools, and personal brand; (b) upon full payment for an Engagement, you grant IMG and the designated brand a worldwide, transferable, sublicensable license to use, reproduce, distribute, display, edit (for format/length/platform), and commercially exploit the deliverables and your name, handle, voice, and likeness as embodied in those deliverables, for the media, territory, and term stated in the Engagement; and (c) IMG may use finished work and behind-the-scenes stills for IMG portfolio, case studies, and marketing unless the Engagement prohibits it in writing.",
        "If an Engagement requires work-made-for-hire or assignment of copyright, you will execute any additional documents reasonably needed to perfect those rights after payment.",
        "You will not use client confidential materials, unreleased products, or embargoed creative outside the Engagement.",
      ],
    },
    {
      title: "8. Brand safety, exclusivity, and non-disparagement",
      paragraphs: [
        "You will follow IMG and brand safety guidelines for each Engagement, including category restrictions (for example competing brands, adult, political, or regulated products) disclosed in writing.",
        "Limited exclusivity applies only when stated in an Engagement and only for the stated category and period. Broader exclusivity requires separate written agreement and additional compensation unless you agree otherwise in writing.",
        "During the term of this Agreement and for twelve (12) months after, you will not make public statements that you know are false and that materially disparage IMG, its members, or its clients, except for truthful statements required by law or in legal proceedings.",
      ],
    },
    {
      title: "9. Confidentiality",
      paragraphs: [
        "You will keep confidential all non-public information about IMG, brands, campaigns, pricing, unreleased products, and ShootSpine business processes, and use it only to perform Engagements. This duty survives for three (3) years after termination, or longer for trade secrets as allowed by law.",
        "Confidentiality does not cover information that is public without your breach, independently developed, or rightfully received from a third party without duty.",
      ],
    },
    {
      title: "10. Representations and warranties",
      bullets: [
        "You are at least 18 years old and have capacity to contract.",
        "You have the right to grant the licenses and appearances described in this Agreement and each Engagement.",
        "Your content will not infringe third-party IP, privacy, or publicity rights, and will not violate law or platform rules.",
        "You will not submit false metrics or impersonate others.",
        "If you operate through an entity, you have authority to bind that entity.",
      ],
    },
    {
      title: "11. Indemnification and limitation of liability",
      paragraphs: [
        `You will defend, indemnify, and hold harmless ${company} and its members, managers, employees, and agents from claims, damages, losses, and expenses (including reasonable attorneys' fees) arising from: (a) your content or posts; (b) your breach of this Agreement or an Engagement; (c) your violation of law or third-party rights; or (d) your failure to include required disclosures.`,
        `TO THE MAXIMUM EXTENT PERMITTED BY LAW, IMG'S TOTAL LIABILITY UNDER THIS AGREEMENT WILL NOT EXCEED THE FEES PAID TO YOU BY IMG IN THE TWELVE (12) MONTHS BEFORE THE CLAIM. NEITHER PARTY IS LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. THESE LIMITS DO NOT APPLY TO YOUR INDEMNITY OBLIGATIONS, YOUR IP INFRINGEMENT, GROSS NEGLIGENCE, WILLFUL MISCONDUCT, OR LIABILITY THAT CANNOT BE LIMITED BY LAW.`,
      ],
    },
    {
      title: "12. Term, suspension, and termination",
      paragraphs: [
        "This Agreement continues until terminated. Either party may terminate network membership for convenience on fourteen (14) days' written notice. IMG may suspend or terminate immediately for material breach, brand-safety failure, fraud, illegal conduct, or reputational harm reasonably attributed to you.",
        "Termination does not cancel accrued payment obligations for accepted Engagement deliverables, or licenses already granted for paid Engagements, unless the Engagement states otherwise.",
        "IMG may remove you from shortlists, campaigns, and portal access upon termination or suspension.",
      ],
    },
    {
      title: "13. Morals and public conduct",
      paragraphs: [
        "If you engage in conduct that brings you into public disrepute, contempt, or scandal, or that materially harms IMG or a brand client (including hate speech, criminal charges for serious offenses, or knowing participation in fraud), IMG may suspend or terminate Engagements and this Agreement and withhold unpaid fees for unfinished work, to the extent permitted by law and the Engagement.",
      ],
    },
    {
      title: "14. Electronic signatures and records",
      paragraphs: [
        "You agree that electronic signatures, clickwrap acceptance, and ShootSpine records of acceptance (including timestamp, account identity, and IP address) satisfy any writing or signature requirement under the ESIGN Act and North Carolina law. IMG may retain signed copies as the authoritative record.",
      ],
    },
    {
      title: "15. Governing law and disputes",
      paragraphs: [
        "This Agreement is governed by the laws of the State of North Carolina, without regard to conflict-of-law rules. The parties will attempt good-faith negotiation before litigation. Exclusive venue lies in the state or federal courts in the county of IMG's principal place of business in North Carolina. Each party consents to personal jurisdiction there. EXCEPT WHERE PROHIBITED, EACH PARTY WAIVES ANY RIGHT TO A JURY TRIAL. The prevailing party may recover reasonable attorneys' fees to the extent permitted by North Carolina law.",
      ],
    },
    {
      title: "16. General",
      paragraphs: [
        "This Agreement is the entire agreement for Creator Network membership and supersedes prior discussions on that subject. It may be updated by IMG posting a new version in ShootSpine; material updates may require your re-acceptance to continue receiving Engagements. If any provision is unenforceable, the rest remains in effect. Failure to enforce a provision is not a waiver. You may not assign this Agreement without IMG's written consent; IMG may assign to an affiliate or successor. Notices may be sent to the email on your ShootSpine profile or to " +
          CREATOR_NETWORK_AGREEMENT_CONTACT +
          ".",
        "Nothing in this Agreement requires IMG to classify you as an employee. If a government authority later reclassifies the relationship despite the parties' intent, the parties will cooperate in good faith to address compliance going forward.",
      ],
    },
  ],
};

/** Stable onboarding task id for the network MSA (must match buildDefaultOnboarding slug). */
export const CREATOR_AGREEMENT_ONBOARDING_TASK_ID = "signed_creator_agreement";
