export type CrewPacketRoleId =
  | "director_producer"
  | "dp_camera"
  | "gaffer_lighting"
  | "sound"
  | "talent"
  | "art_props";

export const CREW_PACKET_ROLE_LABELS: Record<CrewPacketRoleId, string> = {
  director_producer: "Director / Producer",
  dp_camera: "DP / Camera Operator",
  gaffer_lighting: "Gaffer / Lighting",
  sound: "Sound / Audio",
  talent: "Talent",
  art_props: "Art / Props / PA / Continuity",
};

export interface CrewPacketBeat {
  beat: string;
  description: string;
}

export interface CrewPacketMasterShot {
  shotNumber: number;
  location: string;
  shotLabel: string;
  action: string;
  lightingNotes: string;
}

export interface CrewPacketLightingRow {
  setup: string;
  howToMeter: string;
  target: string;
  notes: string;
}

export interface CrewPacketRoleShot {
  shotNumber: number;
  location: string;
  shotLabel: string;
  action: string;
  roleNote: string;
}

export interface CrewPacketRoleSection {
  roleId: CrewPacketRoleId;
  title: string;
  roleFocus: string[];
  onSetChecklist: string[];
  shotPriorities: CrewPacketRoleShot[];
}

export interface CrewPrintoutPacket {
  title: string;
  subtitle: string;
  premise: string;
  primaryLocations: string[];
  visualTone: string;
  beats: CrewPacketBeat[];
  masterShots: CrewPacketMasterShot[];
  lightingTargets: CrewPacketLightingRow[];
  roleSections: CrewPacketRoleSection[];
  generatedAt: string;
}
