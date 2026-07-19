import { INSIGHT_MEDIA_GROUP_LLC } from "@/lib/utils/permissions";
import type { Agreement, AgreementParty, AgreementRole } from "@/lib/types";
import type { ProductionPerson, ProductionPersonGroup } from "@/lib/production/types";

function isInsightName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return (
    n.includes("insight media group") ||
    n === INSIGHT_MEDIA_GROUP_LLC.toLowerCase()
  );
}

function personKey(name: string, role: string): string {
  return `${name.trim().toLowerCase()}|${role.trim().toLowerCase()}`;
}

function groupFromRoleText(role: string): ProductionPersonGroup {
  const r = role.toLowerCase();
  if (
    /\b(talent|actor|actress|model|on[- ]?camera|presenter|host)\b/.test(r)
  ) {
    return "cast";
  }
  if (
    /\b(dp|director of photography|cinematographer|camera|gaffer|grip|1st ac|2nd ac|ac\b|steadicam|dIT)\b/.test(
      r
    )
  ) {
    return "camera_department";
  }
  return "production_team";
}

function groupFromParty(party: AgreementParty): ProductionPersonGroup | null {
  if (party.type === "client") return null;
  if (party.type === "company" && isInsightName(party.name)) return null;
  if (party.type === "company") return null;

  const role = party.roleInAgreement || "";
  const roleLower = role.toLowerCase();
  if (/\b(client|production company|producer company)\b/.test(roleLower)) {
    return null;
  }
  if (/\b(talent|model|actor)\b/.test(roleLower) || party.type === "individual") {
    return groupFromRoleText(role || "Talent");
  }
  return groupFromRoleText(role || "Crew");
}

function makePerson(
  name: string,
  role: string,
  group: ProductionPersonGroup,
  email: string | undefined,
  sortOrder: number
): ProductionPerson {
  return {
    id: crypto.randomUUID(),
    group,
    name: name.trim(),
    role: role.trim() || "Crew",
    ...(email?.trim() ? { email: email.trim() } : {}),
    sortOrder,
  };
}

function nameFromParty(party: AgreementParty): string {
  return (party.signerName || party.name || "").trim();
}

/**
 * Extract cast/crew people from a linked agreement for Prep board seeding.
 * Skips Insight and client/company parties.
 */
export function peopleFromAgreement(agreement: Agreement): ProductionPerson[] {
  const out: ProductionPerson[] = [];
  const seen = new Set<string>();

  const push = (name: string, role: string, group: ProductionPersonGroup, email?: string) => {
    if (!name.trim() || isInsightName(name)) return;
    const key = personKey(name, role);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(makePerson(name, role, group, email, out.length));
  };

  for (const party of agreement.parties ?? []) {
    const group = groupFromParty(party);
    if (!group) continue;
    const name = nameFromParty(party);
    if (!name) continue;
    let role = party.roleInAgreement?.trim() || "Crew";
    if (agreement.agreementType === "talent_agreement" && party.type === "individual") {
      role =
        agreement.talentAgreementDetails?.talentRole?.trim() ||
        role ||
        "Talent";
    }
    if (agreement.agreementType === "contractor_agreement" && party.type === "individual") {
      role =
        agreement.contractorAgreementDetails?.contractorRole?.trim() ||
        role ||
        "Contractor";
    }
    push(name, role, group, party.email);
  }

  for (const roleRow of agreement.roles ?? []) {
    mapAgreementRole(roleRow, push);
  }

  return out;
}

function mapAgreementRole(
  roleRow: AgreementRole,
  push: (name: string, role: string, group: ProductionPersonGroup, email?: string) => void
) {
  const name = roleRow.personOrCompanyName?.trim();
  if (!name || isInsightName(name)) return;
  const role = roleRow.role?.trim() || "Crew";
  push(name, role, groupFromRoleText(role));
}

/** Merge agreement people into board people without clobbering existing rows. */
export function importPeopleFromAgreement(
  existing: ProductionPerson[],
  agreement: Agreement
): ProductionPerson[] {
  const incoming = peopleFromAgreement(agreement);
  if (incoming.length === 0) return existing;

  const seen = new Set(existing.map((p) => personKey(p.name, p.role)));
  const merged = [...existing];
  let sortBase = existing.length;
  for (const person of incoming) {
    const key = personKey(person.name, person.role);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...person, id: crypto.randomUUID(), sortOrder: sortBase++ });
  }
  return merged;
}

export function countNewPeopleFromAgreement(
  existing: ProductionPerson[],
  agreement: Agreement
): number {
  return importPeopleFromAgreement(existing, agreement).length - existing.length;
}
