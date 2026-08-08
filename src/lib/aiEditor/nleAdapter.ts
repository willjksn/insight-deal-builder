/**
 * NLE interchange abstraction — Resolve/Premiere adapters plug in later.
 * Internal timeline (V1E+) must never equal a vendor-specific API model.
 */

export type NleExportTarget = "resolve" | "premiere" | "finalcut" | "generic";

export type NleMediaMapping = {
  mediaAssetId: string;
  relativeProjectPath?: string;
  /** Platform-resolved path for the destination machine, when known */
  resolvedPath?: string;
  checksum?: string;
  filename: string;
};

export type NleHandoffPackage = {
  shootspineManifestVersion: string;
  projectId: string;
  timelineId?: string;
  timelineVersionId?: string;
  target: NleExportTarget;
  media: NleMediaMapping[];
  /** Interchange payload path or inline XML/EDL — format decided at export time */
  interchange?: { format: "fcpxml" | "edl" | "otio" | "other"; contentOrPath: string };
};

export interface NleAdapter {
  readonly id: NleExportTarget;
  exportHandoff(input: {
    projectId: string;
    timelineId: string;
    timelineVersionId: string;
    projectRoot?: string;
  }): Promise<NleHandoffPackage>;
}

/** @deprecated Use ResolveAdapter from resolveExport.ts (V1G). */
export class ResolveAdapterStub implements NleAdapter {
  readonly id = "resolve" as const;
  async exportHandoff(): Promise<NleHandoffPackage> {
    throw new Error("Use buildResolveHandoff / ResolveAdapter from resolveExport.ts");
  }
}

export { ResolveAdapter, buildResolveHandoff } from "@/lib/aiEditor/resolveExport";
