import { Timestamp } from "firebase/firestore";
import { ScriptWriterBrief } from "@/lib/scriptWriter/brief";

export type ScriptWriterSessionStatus = "interviewing" | "script_ready" | "applied";

export interface ScriptWriterMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ScriptDialogueLine {
  character: string;
  parenthetical?: string;
  line: string;
}

export interface ScriptScene {
  sceneNumber: string;
  heading: string;
  action: string;
  dialogue: ScriptDialogueLine[];
}

export interface ScriptCharacter {
  name: string;
  role: string;
  description?: string;
}

export interface ScriptSuggestedShot {
  sceneNumber: string;
  shotNumber: number;
  shotType: string;
  shotName?: string;
  description: string;
  subjectAction?: string;
  cameraMovement?: string;
}

export interface ScriptDocument {
  title: string;
  logline: string;
  lookAndFeel?: string;
  references?: string;
  idealRuntime?: string;
  genre?: string;
  fountain: string;
  scenes: ScriptScene[];
  characters: ScriptCharacter[];
  suggestedShots: ScriptSuggestedShot[];
}

export interface ScriptWriterChatResponse {
  message: string;
  questions?: string[];
  readyToWrite: boolean;
}

export interface ScriptWriterSession {
  id: string;
  userId: string;
  title: string;
  initialIdea: string;
  brief?: ScriptWriterBrief;
  status: ScriptWriterSessionStatus;
  messages: ScriptWriterMessage[];
  script: ScriptDocument | null;
  linkedProjectId?: string;
  linkedScoutProjectId?: string;
  appliedProjectId?: string;
  appliedScoutProjectId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
