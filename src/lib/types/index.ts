import { Timestamp } from "firebase/firestore";

// ─── User ───────────────────────────────────────────────────────────────────
export type UserRole = "admin" | "member";

/** Per-user feature permissions (custom checkboxes in Admin) */
export interface UserPermissions {
  createQuotes: boolean;
  editQuotes: boolean;
  deleteQuotes: boolean;
  duplicateQuotes: boolean;
  signQuotes: boolean;
  downloadPdf: boolean;
  emailQuotes: boolean;
  viewAllOrgDeals: boolean;
  manageClients: boolean;
  manageCompanies: boolean;
  manageCrew: boolean;
  manageProjects: boolean;
  manageTemplates: boolean;
  deleteTemplates: boolean;
  manageUsers: boolean;
  /** View government ID photos captured for renters/talent (Insight staff only) */
  viewIdentityDocs: boolean;
  /** Open W-9 PDFs stored for payee agreements (accounting / admin) */
  viewW9Docs: boolean;
  /** Download payee payment CSV for accounting and 1099 prep */
  exportPayments: boolean;
  /** Script writer, stage planner, reference guide, production boards */
  useShotScout: boolean;
  /** View Revenue & opportunities command center and pipeline */
  viewRevenueOpportunities: boolean;
  /** Create campaigns, approve opportunities, outreach, and convert to projects */
  manageRevenueOpportunities: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  /** @deprecated use permissions.manageUsers — kept for legacy Firestore docs */
  role: UserRole;
  company?: string;
  permissions?: UserPermissions;
  /** Web push (FCM) device tokens */
  fcmTokens?: string[];
  /** Email alerts for agreement events (default true) */
  notifyEmail?: boolean;
  /** Browser push alerts (default true) */
  notifyPush?: boolean;
  /** False until an admin assigns company and permissions */
  approved?: boolean;
  /** Set when a partner is offboarded — login blocked until restored and re-approved */
  archivedAt?: string;
  archivedByUserId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AppUser = UserProfile;

// ─── Company ────────────────────────────────────────────────────────────────
export interface Company {
  id: string;
  legalName: string;
  displayName: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  defaultRole?: string;
  defaultProducerPercentage?: number;
  defaultEquipmentTerms?: string;
  authorizedSignerName: string;
  authorizedSignerTitle: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Client ─────────────────────────────────────────────────────────────────
export interface Client {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  socialHandle?: string;
  authorizedSignerName?: string;
  authorizedSignerTitle?: string;
  billingContact?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Crew ───────────────────────────────────────────────────────────────────
export type RateType = "flat" | "hourly" | "day" | "percentage";

export interface CrewMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  defaultRole?: string;
  defaultRate?: number;
  rateType?: RateType;
  signatureRequired?: boolean;
  initialsRequired?: boolean;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Project ────────────────────────────────────────────────────────────────
export type ProjectType =
  | "Creator Content Day"
  | "Business Reel Package"
  | "Business Brand Package"
  | "Premium Brand Campaign"
  | "Creator-Led Brand Campaign"
  | "Podcast Shoot"
  | "Interview"
  | "Event Coverage"
  | "Real Estate / Location Promo"
  | "Music Video"
  | "Short Film"
  | "Indie Film"
  | "Commercial"
  | "Documentary"
  | "Social Media Retainer"
  | "Product Shoot"
  | "Custom Project";

export type ShootType =
  | "Photo Only"
  | "Video Only"
  | "Photo + Video"
  | "Podcast / Multi-Cam"
  | "Interview / Talking Head"
  | "Cinematic Commercial"
  | "Creator Lifestyle"
  | "Brand Campaign"
  | "Event"
  | "Film Scene"
  | "Custom";

export type ProjectStatus =
  | "draft"
  | "ready_for_signature"
  | "signed"
  | "completed"
  | "archived";

export interface Project {
  id: string;
  projectName: string;
  clientId?: string;
  clientName?: string;
  agreementType: "internal_collaboration" | "client_project";
  projectType: ProjectType;
  shootType: ShootType;
  producerCompanyId?: string;
  clientOwnerCompanyId?: string;
  leadProducerCompanyId?: string;
  totalProjectFee: number;
  shootDate?: string;
  deliveryDate?: string;
  location?: string;
  status: ProjectStatus;
  /** User who created the project — can manage team access without global manageProjects */
  ownerUserId?: string;
  /** Created from Weekly Content Idea Engine */
  sourceIdeaEngine?: boolean;
  sourceIdeaSessionId?: string;
  sourceIdeaId?: string;
  /** Created from Revenue & opportunities conversion */
  sourceRevenueOpportunity?: boolean;
  sourceRevenueOpportunityId?: string;
  sourceRevenueProposalId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Agreement ──────────────────────────────────────────────────────────────
export type AgreementType =
  | "internal_collaboration"
  | "client_project"
  | "equipment_rental"
  | "talent_agreement"
  | "contractor_agreement"
  | "location_agreement";

export type AgreementStatus =
  | "draft"
  | "ready_for_signature"
  | "partially_signed"
  | "signed"
  | "completed"
  | "archived"
  | "void";

export interface AgreementParty {
  id: string;
  type: "company" | "client" | "individual";
  name: string;
  signerName: string;
  signerTitle?: string;
  email?: string;
  roleInAgreement: string;
  signatureRequired: boolean;
  initialsRequired?: boolean;
  /** When set, overrides automatic ID rules for this party */
  idVerificationRequired?: boolean;
}

export interface AgreementRole {
  id: string;
  personOrCompanyName: string;
  role: string;
  responsibilities: string[];
  paymentType: "flat" | "hourly" | "day" | "percentage" | "included";
  paymentAmount?: number;
  paymentPercentage?: number;
  signatureRequired: boolean;
  initialsRequired: boolean;
  notes?: string;
}

export interface AgreementProjectDetails {
  projectName: string;
  clientName?: string;
  shootDate?: string;
  shootTime?: string;
  deliveryDate?: string;
  location?: string;
  projectType: ProjectType;
  shootType: ShootType;
  projectOverview: string;
  projectGoals?: string[];
  notes?: string;
  clientOriginated?: string;
  clientOwner?: string;
  leadProducer?: string;
}

export interface CustomPayout {
  id: string;
  name: string;
  role: string;
  amount: number;
  percentage?: number;
  notes?: string;
}

export interface PayoutDetails {
  totalProjectFee: number;
  insightFeePercentage?: number;
  insightFeeAmount?: number;
  aveFeePercentage?: number;
  aveFeeAmount?: number;
  assistantFeeAmount?: number;
  talentFeeAmount?: number;
  editorFeeAmount?: number;
  expensesAmount?: number;
  filmFundReserveAmount?: number;
  customPayouts?: CustomPayout[];
  payoutNotes?: string;
  insightGearUsed?: boolean;
  insightShooting?: boolean;
  aveShooting?: boolean;
  aveEditing?: boolean;
  talentInvolved?: boolean;
  assistantInvolved?: boolean;
}

export type GearPackageName =
  | "No Insight Gear Used"
  | "Basic Insight Gear Package"
  | "Standard Insight Gear Package"
  | "Full Insight Production Gear Package"
  | "Custom Gear List";

export interface GearItem {
  id: string;
  name: string;
  category?: string;
  serialNumber?: string;
  replacementValue?: number;
  condition?: string;
  assignedTo?: string;
  returnDate?: string;
  notes?: string;
}

export interface GearDetails {
  insightGearUsed: boolean;
  gearPackage: GearPackageName;
  equipmentFeeIncludedInProducerFee: boolean;
  separateEquipmentFee?: number;
  gearItems?: GearItem[];
  gearResponsibilityClause?: string;
}

export interface EquipmentCatalogItem {
  id: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  replacementValue?: number;
  dailyRate: number;
  weeklyRate?: number;
  notes?: string;
  active?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LocationCatalogPropPreset {
  id: string;
  name: string;
  dailyRate: number;
  notes?: string;
}

export interface LocationCatalogItem {
  id: string;
  propertyName: string;
  propertyAddress?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  locationFee: number;
  locationFeeType: "flat" | "day";
  defaultPermittedUse?: string;
  defaultRestrictions?: string;
  insuranceRequired?: boolean;
  insuranceNotes?: string;
  propPresets?: LocationCatalogPropPreset[];
  notes?: string;
  active?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EquipmentRentalLineItem {
  id: string;
  catalogItemId?: string;
  name: string;
  category?: string;
  serialNumber?: string;
  replacementValue?: number;
  quantity: number;
  dailyRate: number;
  days: number;
  lineTotal: number;
  conditionOut?: string;
  notes?: string;
}

export interface EquipmentRentalDetails {
  rentalStartDate?: string;
  rentalEndDate?: string;
  pickupLocation?: string;
  returnLocation?: string;
  lineItems: EquipmentRentalLineItem[];
  depositAmount?: number;
  lateFeePerDay?: number;
  insuranceRequired?: boolean;
  renterInsuranceNotes?: string;
  responsibilityNotes?: string;
}

/** Tax / W-9 fields for payee agreements (accountant export) */
export interface PayeeTaxInfo {
  legalName?: string;
  businessName?: string;
  mailingAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  entityType?: "individual" | "llc" | "corporation" | "partnership";
  w9OnFile?: boolean;
  /** Firebase Storage path — server-only; never expose via public signing API */
  w9StoragePath?: string;
  w9UploadedAt?: string;
  w9FileName?: string;
  w9UploadedBy?: "staff" | "signer";
  taxNotes?: string;
}

export interface TalentAgreementDetails {
  engagementStartDate?: string;
  engagementEndDate?: string;
  shootDates?: string;
  location?: string;
  talentRole?: string;
  appearanceDescription?: string;
  feeAmount: number;
  feeType: "flat" | "day" | "hourly";
  usageScope?: string;
  payeeTax?: PayeeTaxInfo;
}

export interface ContractorAgreementDetails {
  serviceStartDate?: string;
  serviceEndDate?: string;
  contractorRole?: string;
  servicesDescription?: string;
  feeAmount: number;
  feeType: "flat" | "day" | "hourly";
  payeeTax?: PayeeTaxInfo;
}

export type LocationAgreementKind = "location" | "prop" | "location_and_prop";

export interface LocationPropLineItem {
  id: string;
  name: string;
  quantity: number;
  dailyRate: number;
  days: number;
  lineTotal: number;
  conditionNotes?: string;
}

export interface LocationAgreementDetails {
  agreementKind: LocationAgreementKind;
  propertyName: string;
  propertyAddress?: string;
  useStartDate?: string;
  useEndDate?: string;
  shootDates?: string;
  permittedUse?: string;
  restrictions?: string;
  insuranceRequired?: boolean;
  insuranceNotes?: string;
  locationFee: number;
  locationFeeType: "flat" | "day";
  locationDays: number;
  propLineItems: LocationPropLineItem[];
  payeeTax?: PayeeTaxInfo;
}

export interface Deliverable {
  id: string;
  name: string;
  quantity: number;
  format?: string;
  deliveryDate?: string;
  includedRevisions?: number;
  notes?: string;
}

/** Reusable service package — price, deliverables, and default payout splits */
export interface PackageDeliverable {
  name: string;
  quantity: number;
}

/** Stored on packages; id is assigned when applied to an agreement */
export interface PackageCustomPayout {
  name: string;
  role: string;
  amount: number;
  notes?: string;
}

export interface ServicePackage {
  id: string;
  name: string;
  price: number;
  projectType: ProjectType;
  shootType?: ShootType;
  notes?: string;
  deliverables: PackageDeliverable[];
  /** Default Insight producer fee % (internal agreements) */
  insightFeePercentage?: number;
  aveFeePercentage?: number;
  assistantFeeAmount?: number;
  talentFeeAmount?: number;
  editorFeeAmount?: number;
  expensesAmount?: number;
  filmFundReserveAmount?: number;
  insightGearUsed?: boolean;
  /** Extra crew/contractor lines beyond the standard fields */
  customPayouts?: PackageCustomPayout[];
  active?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type PaymentStructure =
  | "100% due before shoot"
  | "50% deposit / 50% before final delivery"
  | "50% deposit / 50% before pickup"
  | "50% deposit / 25% shoot day / 25% before final delivery"
  | "Monthly retainer paid in advance"
  | "Custom";

export interface PaymentTerms {
  totalFee: number;
  paymentStructure: PaymentStructure;
  depositAmount?: number;
  balanceAmount?: number;
  dueDates?: string[];
  paymentNotes?: string;
  /** Optional promotion — list price stays in totalFee/deposit/balance; card pay uses discounted amounts */
  discountPercent?: number;
  discountLabel?: string;
}

export type PaymentInstallmentId = "deposit" | "balance" | "full";

export interface PaymentInstallmentRecord {
  id: string;
  label: string;
  amountDue: number;
  paidAmount: number;
  paidAt?: string;
  recordedBy?: string;
  notes?: string;
  paymentSource?: "manual" | "stripe";
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
}

/** Cash received (client), paid out (payee), or partner splits on internal deals */
export interface AgreementPaymentTracking {
  installments: PaymentInstallmentRecord[];
  partnerInstallments?: PaymentInstallmentRecord[];
  /** Collaborator remittances received by Insight Media Group on internal deals */
  partnerReceivableInstallments?: PaymentInstallmentRecord[];
  /** Lightweight payment invoices (PDF stored in Firebase) */
  paymentInvoices?: PaymentInvoiceRecord[];
}

export type PaymentInvoiceStatus = "sent" | "paid" | "void";

export interface PaymentInvoiceRecord {
  id: string;
  installmentId: string;
  invoiceNumber: string;
  amountDue: number;
  status: PaymentInvoiceStatus;
  issuedAt: string;
  dueDate?: string;
  paidAt?: string;
  storagePath: string;
  sentTo?: string;
  sentAt?: string;
  resendEmailId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
}

export interface RevisionPolicy {
  includedRevisionRounds: number;
  revisionRequestWindowDays: number;
  minorRevisionFee?: number;
  majorRevisionFee?: number;
  additionalNotes?: string;
}

export interface UsageRights {
  organicSocialIncluded: boolean;
  websiteUseIncluded: boolean;
  paidAdsIncluded: boolean;
  paidAdsTerm?: "30 days" | "90 days" | "6 months" | "12 months" | "Custom";
  fullBuyout: boolean;
  usageNotes?: string;
}

export interface RawFootagePolicy {
  rawFootageIncluded: boolean;
  availableForPurchase: boolean;
  rawFootageFee?: number;
  notes?: string;
}

export interface CancellationPolicy {
  depositRefundable: boolean;
  rescheduleAllowed: boolean;
  rescheduleNoticeRequiredHours?: number;
  cancellationNotes?: string;
}

export type ClauseCategory =
  | "payment"
  | "usage"
  | "raw_footage"
  | "cancellation"
  | "equipment"
  | "client_ownership"
  | "deliverables"
  | "general";

export interface AgreementClause {
  id: string;
  title: string;
  body: string;
  requiresInitials: boolean;
  category: ClauseCategory;
  enabled: boolean;
}

export interface SignatureRecord {
  id: string;
  partyId: string;
  signerName: string;
  signerTitle?: string;
  signatureDataUrl: string;
  signedAt: string;
  email?: string;
  agreedToElectronicSignature: boolean;
}

export interface InitialRecord {
  id: string;
  partyId: string;
  clauseId: string;
  initialsDataUrl: string;
  initialedAt: string;
}

/** Government ID capture — storage paths are server-only; never expose via public signing API */
export interface PartyIdentityVerification {
  id: string;
  partyId: string;
  idFrontStoragePath: string;
  idBackStoragePath: string;
  capturedAt: string;
  capturedBy: "signer" | "staff";
  capturedByUserId?: string;
  consentGiven: boolean;
}

/** Redacted shape returned to public signing sessions */
export type PartyIdentityVerificationPublic = Pick<
  PartyIdentityVerification,
  "id" | "partyId" | "capturedAt" | "capturedBy" | "consentGiven"
> & { complete: boolean };

export interface Agreement {
  id: string;
  projectId?: string;
  /** Service package used to auto-fill fee, deliverables, and splits */
  servicePackageId?: string;
  /** Built-in agreement type id or Firestore custom template id */
  templateId?: string;
  agreementType: AgreementType;
  title: string;
  version: number;
  status: AgreementStatus;
  parties: AgreementParty[];
  projectDetails: AgreementProjectDetails;
  payoutDetails?: PayoutDetails;
  gearDetails?: GearDetails;
  equipmentRentalDetails?: EquipmentRentalDetails;
  talentAgreementDetails?: TalentAgreementDetails;
  contractorAgreementDetails?: ContractorAgreementDetails;
  locationAgreementDetails?: LocationAgreementDetails;
  roles: AgreementRole[];
  deliverables: Deliverable[];
  paymentTerms: PaymentTerms;
  /** Recorded cash in/out against payment terms (accounting) */
  paymentTracking?: AgreementPaymentTracking;
  revisionPolicy: RevisionPolicy;
  usageRights: UsageRights;
  rawFootagePolicy: RawFootagePolicy;
  cancellationPolicy: CancellationPolicy;
  clauses: AgreementClause[];
  signatures: SignatureRecord[];
  initials: InitialRecord[];
  identityVerifications?: PartyIdentityVerification[];
  pdfUrl?: string;
  /** Who can read this deal (non-admins). Computed from parties. */
  accessKeys?: string[];
  createdBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Notifications ───────────────────────────────────────────────────────────
export type NotificationType =
  | "agreement_signed"
  | "user_signup_pending"
  | "shared_resource_note";

export interface AppNotification {
  id: string;
  type: NotificationType;
  agreementId?: string;
  agreementTitle?: string;
  projectName?: string;
  signerName?: string;
  pendingUserId?: string;
  pendingUserEmail?: string;
  pendingUserName?: string;
  resourceType?: "script" | "scout";
  resourceId?: string;
  resourceTitle?: string;
  noteAuthorUserId?: string;
  noteAuthorInitials?: string;
  noteAuthorName?: string;
  notePreview?: string;
  /** Specific user to notify (e.g. agreement creator) */
  userId?: string;
  /** All users in this company see the notification (e.g. Insight Media Group LLC) */
  companyRecipient?: string;
  read: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Client signing links ────────────────────────────────────────────────────
export interface SigningLink {
  id: string;
  agreementId: string;
  partyId: string;
  expiresAt: Timestamp;
  createdBy: string;
  revoked?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Template ─────────────────────────────────────────────────────────────────
export interface Template {
  id: string;
  name: string;
  type: AgreementType;
  description: string;
  /** Full clause text for custom templates */
  body?: string;
  isDefault: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
