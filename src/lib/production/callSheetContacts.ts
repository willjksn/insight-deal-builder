import { ProductionBoard, ProductionDay, ProductionPerson } from "@/lib/production/types";

export interface KeyContacts {
  producerName?: string;
  adName?: string;
  directorName?: string;
  dpName?: string;
}

const ROLE_PATTERNS: { key: keyof KeyContacts; patterns: RegExp[] }[] = [
  {
    key: "producerName",
    patterns: [/\bproducer\b/i, /\bline producer\b/i, /\bexec(?:utive)? producer\b/i],
  },
  {
    key: "adName",
    patterns: [/\bassistant director\b/i, /\bfirst ad\b/i, /\b1st ad\b/i, /\bad\b/i],
  },
  {
    key: "directorName",
    patterns: [/\bdirector\b/i],
  },
  {
    key: "dpName",
    patterns: [
      /\bdp\b/i,
      /\bdirector of photography\b/i,
      /\bcinematographer\b/i,
      /\bdop\b/i,
    ],
  },
];

function peoplePool(board: ProductionBoard): ProductionPerson[] {
  return board.people.filter((p) =>
    ["production_team", "camera_department"].includes(p.group)
  );
}

function matchesRole(person: ProductionPerson, patterns: RegExp[]): boolean {
  const haystack = `${person.role} ${person.name}`;
  return patterns.some((pattern) => pattern.test(haystack));
}

/** Prefer director match that isn't "director of photography". */
function pickDirector(people: ProductionPerson[]): ProductionPerson | undefined {
  return people.find((p) => {
    const role = p.role.toLowerCase();
    return /\bdirector\b/i.test(role) && !/photography|cinematography|\bdp\b|\bdop\b/i.test(role);
  });
}

export function deriveKeyContactsFromBoard(board: ProductionBoard): KeyContacts {
  const people = peoplePool(board);
  const contacts: KeyContacts = {};

  for (const { key, patterns } of ROLE_PATTERNS) {
    if (key === "directorName") {
      const match = pickDirector(people);
      if (match?.name?.trim()) contacts.directorName = match.name.trim();
      continue;
    }
    const match = people.find((p) => matchesRole(p, patterns));
    if (match?.name?.trim()) contacts[key] = match.name.trim();
  }

  return contacts;
}

export function mergeKeyContacts(day: ProductionDay, contacts: KeyContacts): ProductionDay {
  return {
    ...day,
    producerName: day.producerName?.trim() || contacts.producerName || day.producerName,
    adName: day.adName?.trim() || contacts.adName || day.adName,
    directorName: day.directorName?.trim() || contacts.directorName || day.directorName,
    dpName: day.dpName?.trim() || contacts.dpName || day.dpName,
  };
}

export function applyKeyContactsFromBoard(day: ProductionDay, board: ProductionBoard): ProductionDay {
  const contacts = deriveKeyContactsFromBoard(board);
  return {
    ...day,
    producerName: contacts.producerName ?? day.producerName,
    adName: contacts.adName ?? day.adName,
    directorName: contacts.directorName ?? day.directorName,
    dpName: contacts.dpName ?? day.dpName,
  };
}

export function keyContactsEmpty(day: ProductionDay): boolean {
  return !(
    day.producerName?.trim() ||
    day.adName?.trim() ||
    day.directorName?.trim() ||
    day.dpName?.trim()
  );
}
