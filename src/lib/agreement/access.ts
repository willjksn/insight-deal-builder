import { AgreementParty } from "@/lib/types";

/**
 * Access keys stored on each agreement document for Firestore security rules.
 * Only Insight Media Group LLC admins see all deals; other users see deals
 * where their email or company matches a party on that agreement.
 */
export function computeAgreementAccessKeys(parties: AgreementParty[]): string[] {
  const keys = new Set<string>();

  for (const party of parties) {
    const email = party.email?.trim().toLowerCase();
    if (email) {
      keys.add(`email:${email}`);
    }
    const name = party.name?.trim();
    if (name) {
      keys.add(`company:${name}`);
    }
  }

  return Array.from(keys);
}

export function userCanAccessAgreement(
  accessKeys: string[] | undefined,
  userEmail: string | null | undefined,
  userCompany: string | null | undefined,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  if (!accessKeys?.length) return false;

  const email = userEmail?.trim().toLowerCase();
  if (email && accessKeys.includes(`email:${email}`)) return true;

  const company = userCompany?.trim();
  if (company && accessKeys.includes(`company:${company}`)) return true;

  return false;
}

export function emailAccessKey(email: string): string {
  return `email:${email.trim().toLowerCase()}`;
}

export function companyAccessKey(company: string): string {
  return `company:${company.trim()}`;
}
