export type StagePropCategory =
  | "lighting"
  | "modifiers"
  | "grip"
  | "camera"
  | "subject"
  | "furniture"
  | "set"
  | "audio"
  | "diagram";

export type StagePropDefinition = {
  id: string;
  name: string;
  category: StagePropCategory;
  tags: string[];
  /** Default footprint width in canvas units */
  width: number;
  height: number;
  color: string;
  shape:
    | "rect"
    | "circle"
    | "softbox"
    | "strip-softbox"
    | "octabox"
    | "umbrella"
    | "beauty-dish"
    | "open-face"
    | "fresnel"
    | "led-panel"
    | "led-tube"
    | "practical-lamp"
    | "ring-light"
    | "diffuser"
    | "scrim"
    | "eggcrate"
    | "bounce"
    | "reflector"
    | "flag"
    | "finger-flag"
    | "snoot"
    | "cookie"
    | "barn-doors"
    | "c-stand"
    | "sandbag"
    | "apple-box"
    | "person"
    | "person-two"
    | "camera"
    | "tripod"
    | "gimbal"
    | "slider"
    | "monitor"
    | "chair"
    | "couch"
    | "bed"
    | "nightstand"
    | "table"
    | "desk"
    | "backdrop"
    | "wall"
    | "window"
    | "door"
    | "boom-mic"
    | "lav";
};

export type StagePropElement = {
  id: string;
  kind: "prop";
  propId: string;
  x: number;
  y: number;
  rotation: number;
  /** @deprecated use width/height — kept for older boards */
  scale: number;
  /** Display width in canvas px (overrides catalog × scale when set) */
  width?: number;
  /** Display height in canvas px */
  height?: number;
  label?: string;
};

export type StageNoteElement = {
  id: string;
  kind: "note";
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  body: string;
  template?: "camera" | "light" | "general";
};

export type StageArrowElement = {
  id: string;
  kind: "arrow";
  x: number;
  y: number;
  x2: number;
  y2: number;
};

export type StageWallElement = {
  id: string;
  kind: "wall";
  x: number;
  y: number;
  x2: number;
  y2: number;
  thickness: number;
};

export type StageRoomElement = {
  id: string;
  kind: "room";
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
};

export type StageDoorwayElement = {
  id: string;
  kind: "doorway";
  x: number;
  y: number;
  width: number;
  height: number;
  swing?: "left" | "right";
};

export type StageElement =
  | StagePropElement
  | StageNoteElement
  | StageArrowElement
  | StageWallElement
  | StageRoomElement
  | StageDoorwayElement;

export type StageTool =
  | "select"
  | "arrow"
  | "note"
  | "wall"
  | "room"
  | "doorway";

export type StageBoard = {
  id: string;
  userId: string;
  projectId?: string;
  title: string;
  elements: StageElement[];
  showGrid: boolean;
  updatedAt?: unknown;
  createdAt?: unknown;
};

export const STAGE_PROP_CATEGORIES: { id: StagePropCategory; label: string }[] = [
  { id: "lighting", label: "Lighting" },
  { id: "modifiers", label: "Modifiers & diffusion" },
  { id: "grip", label: "Grip" },
  { id: "camera", label: "Camera" },
  { id: "subject", label: "Subject" },
  { id: "furniture", label: "Furniture" },
  { id: "set", label: "Set" },
  { id: "audio", label: "Audio" },
  { id: "diagram", label: "Diagram tools" },
];

export const NOTE_TEMPLATES = {
  camera: {
    title: "NOTES",
    body: "FX6\nLens:\n50mm\nf/2.8\n1/50\nISO 800",
  },
  light: {
    title: "NOTES",
    body: "Light model\nModifier:\nPower:\nf/ at subject",
  },
  general: {
    title: "NOTES",
    body: "Feathered on model, spilling on background",
  },
} as const;
