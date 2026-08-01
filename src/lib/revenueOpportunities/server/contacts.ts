import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { REVENUE_CONTACTS_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { getOpportunity, updateOpportunity } from "@/lib/revenueOpportunities/server/opportunities";
import type {
  RevenueContact,
  RevenueContactCreateInput,
  RevenueContactUpdateInput,
} from "@/lib/revenueOpportunities/types/contact";
import { AppUser } from "@/lib/types";

function requireDb(): Firestore {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  return db;
}

function tenantCompany(appUser: AppUser): string {
  const company = appUser.company?.trim();
  if (!company) throw new RevenueOpportunityError("NOT_AUTHORIZED", "Organization company is required");
  return company;
}

function normalizeEmail(email?: string): string | undefined {
  const v = email?.trim().toLowerCase();
  return v || undefined;
}

async function loadOwned(appUser: AppUser, id: string) {
  const db = requireDb();
  const ref = db.collection(REVENUE_CONTACTS_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new RevenueOpportunityError("NOT_FOUND", "Contact not found");
  const contact = serializeDoc<RevenueContact>(snap.id, snap.data()!);
  if (contact.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Contact not found");
  }
  return { ref, contact };
}

export async function listContacts(appUser: AppUser): Promise<RevenueContact[]> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let q: FirebaseFirestore.Query = db
        .collection(REVENUE_CONTACTS_COLLECTION)
        .where("organizationCompany", "==", organizationCompany);
      if (ordered) q = q.orderBy("updatedAt", "desc");
      return q;
    },
    "updatedAt"
  );
  return docs.map((d) => serializeDoc<RevenueContact>(d.id, d.data()));
}

export async function getContact(appUser: AppUser, id: string): Promise<RevenueContact> {
  const { contact } = await loadOwned(appUser, id);
  return contact;
}

export async function findContactByEmail(
  appUser: AppUser,
  email: string
): Promise<RevenueContact | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const db = requireDb();
  const snap = await db
    .collection(REVENUE_CONTACTS_COLLECTION)
    .where("organizationCompany", "==", tenantCompany(appUser))
    .where("email", "==", normalized)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return serializeDoc<RevenueContact>(snap.docs[0].id, snap.docs[0].data());
}

export async function createContact(
  appUser: AppUser,
  input: RevenueContactCreateInput
): Promise<RevenueContact> {
  const name = input.name?.trim();
  if (!name) throw new RevenueOpportunityError("VALIDATION_FAILED", "Name is required");
  const email = normalizeEmail(input.email);
  if (email) {
    const existing = await findContactByEmail(appUser, email);
    if (existing) {
      return updateContact(appUser, existing.id, {
        name: input.name?.trim() || existing.name,
        phone: input.phone?.trim() || existing.phone,
        title: input.title?.trim() || existing.title,
        companyName: input.companyName?.trim() || existing.companyName,
        opportunityIdToLink: input.opportunityId,
      });
    }
  }

  const db = requireDb();
  const opportunityIds = input.opportunityId ? [input.opportunityId] : [];
  const payload = stripUndefined({
    organizationCompany: tenantCompany(appUser),
    ownerUserId: appUser.id,
    name,
    email,
    phone: input.phone?.trim(),
    title: input.title?.trim(),
    companyName: input.companyName?.trim(),
    linkedInUrl: input.linkedInUrl?.trim(),
    notes: input.notes?.trim(),
    opportunityIds,
    clientId: input.clientId,
    source: input.source ?? "manual",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const ref = await db.collection(REVENUE_CONTACTS_COLLECTION).add(payload);
  const snap = await ref.get();
  return serializeDoc<RevenueContact>(ref.id, snap.data()!);
}

export async function updateContact(
  appUser: AppUser,
  id: string,
  input: RevenueContactUpdateInput & { opportunityIdToLink?: string }
): Promise<RevenueContact> {
  const { ref, contact } = await loadOwned(appUser, id);
  const opportunityIds = [...(contact.opportunityIds ?? [])];
  if (input.opportunityIdToLink && !opportunityIds.includes(input.opportunityIdToLink)) {
    opportunityIds.push(input.opportunityIdToLink);
  }
  await ref.update(
    stripUndefined({
      ...(typeof input.name === "string" ? { name: input.name.trim() } : {}),
      ...(input.email !== undefined ? { email: normalizeEmail(input.email) ?? "" } : {}),
      ...(typeof input.phone === "string" ? { phone: input.phone.trim() } : {}),
      ...(typeof input.title === "string" ? { title: input.title.trim() } : {}),
      ...(typeof input.companyName === "string" ? { companyName: input.companyName.trim() } : {}),
      ...(typeof input.linkedInUrl === "string" ? { linkedInUrl: input.linkedInUrl.trim() } : {}),
      ...(typeof input.notes === "string" ? { notes: input.notes } : {}),
      ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
      opportunityIds,
      updatedAt: FieldValue.serverTimestamp(),
    })
  );
  const snap = await ref.get();
  return serializeDoc<RevenueContact>(snap.id, snap.data()!);
}

export async function deleteContact(appUser: AppUser, id: string): Promise<void> {
  const { ref } = await loadOwned(appUser, id);
  await ref.delete();
}

/** Upsert CRM contact from opportunity.contact and link contactId on the opportunity. */
export async function upsertContactFromOpportunity(
  appUser: AppUser,
  opportunityId: string
): Promise<{ contact: RevenueContact; opportunityId: string }> {
  const opportunity = await getOpportunity(appUser, opportunityId);
  const embedded = opportunity.contact;
  const name =
    embedded?.name?.trim() ||
    opportunity.subject.name.trim();
  const email = normalizeEmail(embedded?.email || opportunity.subject.publicEmail);
  if (!email && !embedded?.phone?.trim()) {
    throw new RevenueOpportunityError(
      "VALIDATION_FAILED",
      "Add a contact email or phone on the opportunity before saving to Contacts."
    );
  }

  let contact: RevenueContact;
  if (email) {
    const existing = await findContactByEmail(appUser, email);
    if (existing) {
      contact = await updateContact(appUser, existing.id, {
        name: embedded?.name?.trim() || existing.name,
        phone: embedded?.phone?.trim() || existing.phone,
        title: embedded?.title?.trim() || existing.title,
        companyName: opportunity.subject.name,
        opportunityIdToLink: opportunityId,
      });
    } else {
      contact = await createContact(appUser, {
        name,
        email,
        phone: embedded?.phone,
        title: embedded?.title,
        companyName: opportunity.subject.name,
        opportunityId,
        clientId: opportunity.clientId,
        source: opportunity.contactSuggestion?.status === "applied" ? "agent" : "opportunity",
      });
    }
  } else {
    contact = await createContact(appUser, {
      name,
      phone: embedded?.phone,
      title: embedded?.title,
      companyName: opportunity.subject.name,
      opportunityId,
      clientId: opportunity.clientId,
      source: "opportunity",
    });
  }

  await updateOpportunity(appUser, opportunityId, {
    contactId: contact.id,
    contact: {
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      title: contact.title,
    },
  });

  return { contact, opportunityId };
}
