import {
  Briefcase,
  Handshake,
  HardDrive,
  MapPin,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import { buildBuiltinTemplateBody } from "@/lib/templates/buildBuiltinTemplateBody";
import { getAgreementTypeLabel } from "@/lib/agreement/wizardSteps";
import { AgreementType } from "@/lib/types";

export interface TemplateCatalogEntry {
  id: AgreementType;
  name: string;
  type: AgreementType;
  description: string;
  body: string;
  categoryLabel: string;
  icon: LucideIcon;
}

export const BUILTIN_TEMPLATES: TemplateCatalogEntry[] = [
  {
    id: "internal_collaboration",
    name: "Internal Collaboration",
    type: "internal_collaboration",
    description: "Insight + partner collaborations, payouts & gear",
    body: buildBuiltinTemplateBody("internal_collaboration"),
    categoryLabel: "Internal",
    icon: Handshake,
  },
  {
    id: "client_project",
    name: "Client Project",
    type: "client_project",
    description: "Production company + client deliverables & payment",
    body: buildBuiltinTemplateBody("client_project"),
    categoryLabel: "Client",
    icon: Users,
  },
  {
    id: "equipment_rental",
    name: "Equipment Rental",
    type: "equipment_rental",
    description: "Rent gear with line-item pricing, deposit, and return terms",
    body: buildBuiltinTemplateBody("equipment_rental"),
    categoryLabel: "Rental",
    icon: HardDrive,
  },
  {
    id: "talent_agreement",
    name: "Talent Agreement",
    type: "talent_agreement",
    description: "On-camera talent, releases, usage, ID verification",
    body: buildBuiltinTemplateBody("talent_agreement"),
    categoryLabel: "Talent",
    icon: UserCircle,
  },
  {
    id: "contractor_agreement",
    name: "Contractor Agreement",
    type: "contractor_agreement",
    description: "Crew & contractors — services, pay, W-9, work-for-hire",
    body: buildBuiltinTemplateBody("contractor_agreement"),
    categoryLabel: "Contractor",
    icon: Briefcase,
  },
  {
    id: "location_agreement",
    name: "Location & Prop",
    type: "location_agreement",
    description: "Film locations, property releases, prop line-item fees",
    body: buildBuiltinTemplateBody("location_agreement"),
    categoryLabel: "Location",
    icon: MapPin,
  },
];

export const BUILTIN_TEMPLATE_IDS = new Set<string>(BUILTIN_TEMPLATES.map((t) => t.id));

export function isBuiltinTemplateId(id: string): boolean {
  return BUILTIN_TEMPLATE_IDS.has(id);
}

export function getBuiltinTemplate(id: string): TemplateCatalogEntry | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}

export const AGREEMENT_TYPE_OPTIONS: { value: AgreementType; label: string }[] = (
  [
    "internal_collaboration",
    "client_project",
    "equipment_rental",
    "talent_agreement",
    "contractor_agreement",
    "location_agreement",
  ] as AgreementType[]
).map((value) => ({ value, label: getAgreementTypeLabel(value) }));
