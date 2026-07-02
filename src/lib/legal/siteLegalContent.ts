import { APP_DOMAIN, APP_NAME } from "@/lib/brand";
import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";

export const LEGAL_LAST_UPDATED = "June 30, 2026";
export const LEGAL_CONTACT_EMAIL = `legal@${APP_DOMAIN}`;
export const PRIVACY_CONTACT_EMAIL = `privacy@${APP_DOMAIN}`;

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type SiteLegalDocument = {
  title: string;
  subtitle: string;
  sections: LegalSection[];
};

const operator = PRODUCER_LEGAL_NAME;
const product = APP_NAME;

export const TERMS_OF_SERVICE: SiteLegalDocument = {
  title: "Terms of Service",
  subtitle: `${product} is operated by ${operator}. These Terms govern access to and use of the platform.`,
  sections: [
    {
      title: "1. Agreement to these Terms",
      paragraphs: [
        `These Terms of Service ("Terms") form a binding agreement between you and ${operator}, a North Carolina limited liability company ("we," "us," "our"), governing use of ${product} at ${APP_DOMAIN} and related services (collectively, the "Service").`,
        `By creating an account, requesting access, signing in, or using the Service, you accept these Terms and our Privacy Policy. If you use the Service for an organization, you represent that you have authority to bind that organization. If you do not agree, do not use the Service.`,
        "You must be at least 18 years old and able to form a binding contract.",
      ],
    },
    {
      title: "2. The Service",
      paragraphs: [
        `${product} is production operations software for scripts, scouting, agreements, quotes, payments, and related workflows. Features, limits, and availability may change. We may modify, suspend, or discontinue any part of the Service at any time, with reasonable notice when practical for material changes affecting paid functionality.`,
        `${product} is a tool, not a law firm. Templates, clauses, and automation are informational starting points only. You are solely responsible for reviewing all agreements, quotes, and client communications with qualified counsel before use.`,
      ],
    },
    {
      title: "3. Accounts, approval, and security",
      bullets: [
        "You must provide accurate registration information and keep it current.",
        "Access may require administrator approval and assigned permissions before full use.",
        "You are responsible for safeguarding credentials and all activity under your account.",
        "Notify us promptly at the contact below if you suspect unauthorized access.",
        "We may refuse registration, suspend, or terminate access for violation of these Terms, fraud, abuse, security risk, non-payment, or legal requirement.",
      ],
    },
    {
      title: "4. Your Content and client data",
      paragraphs: [
        `You retain ownership of scripts, scout data, agreements, client records, files, and other material you submit or generate through the Service ("Your Content"). You grant ${operator} a worldwide, non-exclusive, royalty-free license to host, copy, transmit, display, back up, and process Your Content solely to operate, secure, and improve the Service and as otherwise described in our Privacy Policy.`,
        "You represent and warrant that: (a) you own or have all rights, licenses, consents, and permissions needed for Your Content; (b) Your Content and your use of the Service comply with applicable law and third-party rights; and (c) you have obtained required notices and consents from clients, talent, crew, and other individuals whose personal information you upload.",
        `${operator} acts as a service provider to you with respect to client and project data you control. You are responsible for your privacy obligations to your clients and collaborators.`,
      ],
    },
    {
      title: "5. Acceptable use",
      bullets: [
        "Do not access, probe, scrape, or attempt to bypass another user's workspace, permissions, or security controls.",
        "Do not reverse engineer, decompile, or interfere with the Service except where prohibited restrictions cannot be waived by law.",
        "Do not upload malware, unlawful content, infringing material, or content that violates privacy, publicity, or intellectual property rights.",
        "Do not use the Service for spam, harassment, or unauthorized marketing.",
        "Do not overload, disrupt, or impair the Service or its infrastructure.",
        "Do not misrepresent your identity, affiliation, or authority.",
      ],
    },
    {
      title: "6. Client signing and payments",
      paragraphs: [
        `You control when agreements, signing links, and payment requests are sent to clients. ${operator} is not a party to your client contracts unless expressly stated in a separate written agreement.`,
        `When enabled, card payments may be processed by Stripe, Inc. and its affiliates. Stripe's terms and privacy policy apply to payment processing. ${operator} does not store full payment card numbers. We are not responsible for Stripe outages, declines, chargebacks, refunds, or tax reporting for your client transactions unless expressly agreed in writing.`,
        "Deposits, balances, refunds, and deliverables are governed by your agreements with clients, not by these Terms alone.",
      ],
    },
    {
      title: "7. Third-party services",
      paragraphs: [
        "The Service integrates with third-party providers such as cloud hosting, authentication, email, analytics, and payment processors. Your use of those features may be subject to the third party's terms. We are not responsible for third-party services outside our reasonable control.",
      ],
    },
    {
      title: "8. Confidentiality",
      paragraphs: [
        `We will treat non-public workspace data as confidential and use it only to provide and secure the Service, except as described in our Privacy Policy, required by law, or with your direction (for example, when you send documents to clients).`,
      ],
    },
    {
      title: "9. Feedback",
      paragraphs: [
        "If you provide suggestions or feedback, you grant us a perpetual, irrevocable, royalty-free license to use it without restriction or compensation.",
      ],
    },
    {
      title: "10. Termination",
      paragraphs: [
        "You may stop using the Service at any time. We may suspend or terminate access immediately for breach, risk, or legal requirement.",
        "Upon termination, your right to access the Service ends. We may retain and use data as described in our Privacy Policy and as required by law. Provisions that by nature should survive termination will survive, including ownership, disclaimers, limitations of liability, indemnification, and governing law.",
      ],
    },
    {
      title: "11. Disclaimers",
      paragraphs: [
        `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE." TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${operator.toUpperCase()} DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR THAT DOCUMENT OUTPUTS WILL BE LEGALLY SUFFICIENT FOR ANY PURPOSE.`,
      ],
    },
    {
      title: "12. Limitation of liability",
      paragraphs: [
        `TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${operator.toUpperCase()} AND ITS MEMBERS, MANAGERS, EMPLOYEES, AND CONTRACTORS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS INTERRUPTION, EVEN IF ADVISED OF THE POSSIBILITY.`,
        `OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THE SERVICE OR THESE TERMS WILL NOT EXCEED THE GREATER OF (A) AMOUNTS YOU PAID ${operator.toUpperCase()} FOR THE SERVICE IN THE TWELVE (12) MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS ($100). THESE LIMITS APPLY TO ALL THEORIES OF LIABILITY AND EVEN IF A REMEDY FAILS OF ITS ESSENTIAL PURPOSE.`,
        "Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the maximum extent permitted by law.",
      ],
    },
    {
      title: "13. Indemnification",
      paragraphs: [
        `You will defend, indemnify, and hold harmless ${operator} and its members, managers, employees, and contractors from claims, damages, losses, liabilities, and expenses (including reasonable attorneys' fees) arising from: (a) Your Content; (b) your use of the Service; (c) your client agreements, signing flows, or payment requests; (d) your violation of law or third-party rights; or (e) your breach of these Terms.`,
      ],
    },
    {
      title: "14. Governing law; disputes",
      paragraphs: [
        `These Terms are governed by the laws of the State of North Carolina, without regard to conflict-of-law rules. EXCEPT WHERE PROHIBITED BY LAW, EACH PARTY WAIVES ANY RIGHT TO A JURY TRIAL.`,
        `Exclusive venue for any dispute arising out of these Terms or the Service shall be in the state or federal courts located in North Carolina, and each party consents to personal jurisdiction and service of process in those courts. The prevailing party may recover reasonable attorneys' fees and costs to the extent permitted by North Carolina law.`,
      ],
    },
    {
      title: "15. General",
      bullets: [
        "These Terms, together with the Privacy Policy, are the entire agreement regarding the Service.",
        "If any provision is unenforceable, the remainder remains in effect.",
        "Our failure to enforce a provision is not a waiver.",
        "You may not assign these Terms without our consent; we may assign them in connection with a merger, acquisition, or sale of assets.",
        "We may update these Terms by posting a revised version with a new effective date. Material changes may also be communicated by email or in-product notice when practical. Continued use after the effective date constitutes acceptance.",
      ],
    },
    {
      title: "16. Contact",
      paragraphs: [
        `Legal questions: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};

export const PRIVACY_POLICY: SiteLegalDocument = {
  title: "Privacy Policy",
  subtitle: `${operator} explains how ${product} collects, uses, shares, and protects information.`,
  sections: [
    {
      title: "1. Scope and roles",
      paragraphs: [
        `${operator} ("we," "us") operates ${product} at ${APP_DOMAIN}. This Privacy Policy describes our practices when you use the Service.`,
        "When you store client, crew, or project information in your workspace, you are generally the controller of that information and we process it on your behalf to provide the Service. This Policy also covers account and platform data for which we act as controller.",
      ],
    },
    {
      title: "2. Information we collect",
      bullets: [
        "Account data: name, email, company, role, permissions, authentication identifiers, and approval status.",
        "Workspace data: projects, scripts, scout sessions, agreements, templates, clients, crew, locations, notes, uploads, signatures metadata, and payment status you create or store.",
        "Technical data: IP address, device and browser type, logs, timestamps, and feature usage for security, debugging, and reliability.",
        "Payment data: Stripe transaction IDs, amounts, status, and payer email references. Card numbers are collected and processed by Stripe, not stored by us.",
        "Communications: support messages, notification preferences, email delivery events, and push notification tokens if enabled.",
      ],
    },
    {
      title: "3. How we use information",
      bullets: [
        "Provide, maintain, authenticate, and personalize the Service.",
        "Enforce permissions, workspace access, and account approval workflows.",
        "Send transactional messages, agreement links, payment links, and notifications you or your organization enable.",
        "Detect abuse, fraud, and security incidents.",
        "Improve performance, troubleshoot errors, and develop features.",
        "Comply with law, respond to lawful requests, and protect rights and safety.",
      ],
    },
    {
      title: "4. Legal bases",
      paragraphs: [
        "Where applicable, we rely on: performance of our contract with you; legitimate interests in operating a secure SaaS platform; your consent (for example, push notifications); and legal obligations.",
      ],
    },
    {
      title: "5. How we share information",
      paragraphs: [
        "We do not sell personal information. We do not share personal information for cross-context behavioral advertising. We disclose information only as follows:",
      ],
      bullets: [
        "Service providers under contract, including Google Firebase (hosting, authentication, database), Stripe (payments), Resend or similar email providers, and cloud infrastructure vendors.",
        "Other authorized users in your organization according to permissions configured by you or your administrator.",
        "Clients, signers, or payers when you send agreements, signing links, payment pages, or shared exports.",
        "Professional advisors, auditors, or successors in a merger, acquisition, or asset sale subject to confidentiality.",
        "Law enforcement, regulators, or others when required by law or to protect rights, safety, and security.",
      ],
    },
    {
      title: "6. Retention",
      paragraphs: [
        "We retain information while your account is active and as needed to provide the Service, resolve disputes, enforce agreements, and meet legal, tax, and accounting obligations.",
        "Backups and logs may persist for a limited period after deletion. We may retain anonymized or aggregated data that no longer identifies you.",
      ],
    },
    {
      title: "7. Security",
      paragraphs: [
        "We use administrative, technical, and organizational measures such as encrypted transport (HTTPS), authenticated access controls, and permission-based data access. No system is completely secure.",
        "If we become aware of a security incident involving personal information that we are legally required to report, we will notify affected users or controllers without unreasonable delay.",
      ],
    },
    {
      title: "8. Your choices and rights",
      bullets: [
        "Update certain profile information in Settings.",
        "Disable push notifications in your browser or device settings.",
        "Request access, correction, or deletion by contacting us, subject to legal exceptions and backup retention.",
        "California residents may have additional rights to know, delete, and correct personal information and to opt out of sale/sharing — we do not sell or share personal information for cross-context behavioral advertising.",
      ],
    },
    {
      title: "9. Cookies and local storage",
      paragraphs: [
        "We use cookies, local storage, and similar technologies for authentication sessions, security, and preferences. Sign-in requires functional storage for Firebase authentication. You can control cookies through browser settings, but some features may not work if disabled.",
      ],
    },
    {
      title: "10. Sensitive information",
      paragraphs: [
        "Do not upload government IDs, full payment card numbers, health information, or other sensitive categories unless necessary and permitted by law. We do not intentionally collect sensitive personal information through the Service.",
      ],
    },
    {
      title: "11. Children",
      paragraphs: [
        "The Service is not directed to children under 13 (or 16 where applicable), and we do not knowingly collect their personal information. Contact us to request deletion if you believe we received such information.",
      ],
    },
    {
      title: "12. International transfers",
      paragraphs: [
        "If you access the Service from outside the United States, you understand that information may be processed in the U.S. and other countries where our providers operate, which may have different data protection laws.",
      ],
    },
    {
      title: "13. Changes",
      paragraphs: [
        "We may update this Privacy Policy by posting a revised version with a new effective date. Material changes may be communicated by email or in-product notice when practical.",
      ],
    },
    {
      title: "14. Contact",
      paragraphs: [
        `Privacy requests and questions: ${PRIVACY_CONTACT_EMAIL}. General legal contact: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};
