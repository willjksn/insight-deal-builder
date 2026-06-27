import {
  createDocument,
  getCollection,
} from "@/lib/firebase/firestore";
import {
  SEED_COMPANIES,
  SEED_CREW,
  SEED_CLIENTS,
  SEED_DEMO_PROJECT,
  SEED_PROJECTS,
} from "./demoData";
import { SERVICE_PACKAGE_PRESETS } from "@/lib/constants/presets";
import { presetToServicePackage } from "@/lib/agreement/packages";

export interface SeedResult {
  companies: number;
  crew: number;
  clients: number;
  projects: number;
  packages: number;
  skipped: string[];
}

async function existsByField<T extends { id: string }>(
  collection: string,
  field: string,
  value: string
): Promise<boolean> {
  const items = await getCollection<T & Record<string, unknown>>(collection);
  return items.some((item) => item[field] === value);
}

/**
 * Seed Firestore with demo/business defaults.
 * Skips records that already exist (matched by legalName, businessName, name, or projectName).
 */
export async function seedFirestore(): Promise<SeedResult> {
  const result: SeedResult = { companies: 0, crew: 0, clients: 0, projects: 0, packages: 0, skipped: [] };

  for (const company of SEED_COMPANIES) {
    if (await existsByField("companies", "legalName", company.legalName)) {
      result.skipped.push(`Company: ${company.legalName}`);
      continue;
    }
    await createDocument("companies", company);
    result.companies++;
  }

  for (const member of SEED_CREW) {
    if (await existsByField("crewMembers", "name", member.name)) {
      result.skipped.push(`Crew: ${member.name}`);
      continue;
    }
    await createDocument("crewMembers", member);
    result.crew++;
  }

  let demoClientId: string | undefined;
  for (const client of SEED_CLIENTS) {
    const existing = (await getCollection<{ id: string; businessName: string }>("clients")).find(
      (c) => c.businessName === client.businessName
    );
    if (existing) {
      result.skipped.push(`Client: ${client.businessName}`);
      demoClientId = existing.id;
      continue;
    }
    demoClientId = await createDocument("clients", client);
    result.clients++;
  }

  // Link demo project to demo client
  if (!(await existsByField("projects", "projectName", SEED_DEMO_PROJECT.projectName))) {
    const demoClient = SEED_CLIENTS[0];
    await createDocument("projects", {
      ...SEED_DEMO_PROJECT,
      clientId: demoClientId,
      clientName: demoClient.businessName,
    });
    result.projects++;
  } else {
    result.skipped.push(`Project: ${SEED_DEMO_PROJECT.projectName}`);
  }

  // Seed standard package projects (without client link — templates for admin)
  for (const project of SEED_PROJECTS) {
    if (await existsByField("projects", "projectName", project.projectName)) {
      result.skipped.push(`Project: ${project.projectName}`);
      continue;
    }
    await createDocument("projects", project);
    result.projects++;
  }

  for (const preset of SERVICE_PACKAGE_PRESETS) {
    if (await existsByField("servicePackages", "name", preset.name)) {
      result.skipped.push(`Package: ${preset.name}`);
      continue;
    }
    await createDocument("servicePackages", presetToServicePackage(preset));
    result.packages++;
  }

  return result;
}
