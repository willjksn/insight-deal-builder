import {
  ScriptCharacter,
  ScriptDialogueLine,
  ScriptDocument,
  ScriptScene,
} from "@/lib/scriptWriter/types";
import {
  assignSceneNumbers,
  parseRawElements,
  reindexElements,
  removeEmptyElements,
} from "@/lib/screenplay/elements";
import { fountainToElements, elementsToFountain } from "@/lib/screenplay/fountain";
import { prepareScriptDocumentForFirestore } from "@/lib/screenplay/serialize";
import { ScriptElement } from "@/lib/screenplay/types";

export function getScriptElements(script: ScriptDocument): ScriptElement[] {
  if (script.elements?.length) {
    return assignSceneNumbers(reindexElements(script.elements));
  }
  if (script.fountain?.trim()) {
    return fountainToElements(script.fountain);
  }
  return scenesToElements(script);
}

export function normalizeScriptDocument(script: ScriptDocument): ScriptDocument {
  const parsedFromAi = parseRawElements(
    (script as ScriptDocument & { elements?: unknown }).elements
  );

  let elements = parsedFromAi ?? getScriptElements(script);
  elements = assignSceneNumbers(removeEmptyElements(reindexElements(elements)));

  const fountain = elementsToFountain(elements);
  const scenes = deriveScenesFromElements(elements);

  return prepareScriptDocumentForFirestore({
    ...script,
    elements,
    fountain,
    scenes: script.scenes?.length ? script.scenes : scenes,
  });
}

export function scenesToElements(script: ScriptDocument): ScriptElement[] {
  if (!script.scenes?.length) return [];

  const elements: ScriptElement[] = [];
  for (const scene of script.scenes) {
    if (scene.heading?.trim()) {
      elements.push({
        id: crypto.randomUUID(),
        type: "scene_heading",
        text: scene.heading.trim().toUpperCase(),
        order: elements.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    if (scene.action?.trim()) {
      elements.push({
        id: crypto.randomUUID(),
        type: "action",
        text: scene.action.trim(),
        order: elements.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    for (const line of scene.dialogue ?? []) {
      if (line.character?.trim()) {
        elements.push({
          id: crypto.randomUUID(),
          type: "character",
          text: line.character.trim().toUpperCase(),
          order: elements.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      if (line.parenthetical?.trim()) {
        elements.push({
          id: crypto.randomUUID(),
          type: "parenthetical",
          text: line.parenthetical.trim(),
          order: elements.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      if (line.line?.trim()) {
        elements.push({
          id: crypto.randomUUID(),
          type: "dialogue",
          text: line.line.trim(),
          order: elements.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  return assignSceneNumbers(elements);
}

export function deriveScenesFromElements(elements: ScriptElement[]): ScriptScene[] {
  const scenes: ScriptScene[] = [];
  let current: ScriptScene | null = null;
  let pendingCharacter: string | null = null;
  let pendingParenthetical: string | undefined;

  const pushDialogue = (line: string) => {
    if (!current || !pendingCharacter) return;
    current.dialogue.push({
      character: pendingCharacter,
      parenthetical: pendingParenthetical,
      line,
    });
    pendingParenthetical = undefined;
  };

  for (const element of elements) {
    if (element.type === "note") continue;

    if (element.type === "scene_heading") {
      if (current) scenes.push(current);
      current = {
        sceneNumber: String(element.sceneNumber ?? scenes.length + 1),
        heading: element.text.trim(),
        action: "",
        dialogue: [],
      };
      pendingCharacter = null;
      pendingParenthetical = undefined;
      continue;
    }

    if (!current) {
      current = {
        sceneNumber: "1",
        heading: "INT. LOCATION - DAY",
        action: "",
        dialogue: [],
      };
    }

    switch (element.type) {
      case "action":
        current.action = current.action
          ? `${current.action}\n\n${element.text.trim()}`
          : element.text.trim();
        pendingCharacter = null;
        pendingParenthetical = undefined;
        break;
      case "character":
        pendingCharacter = element.text.trim();
        pendingParenthetical = undefined;
        break;
      case "parenthetical":
        pendingParenthetical = element.text.trim();
        break;
      case "dialogue":
        pushDialogue(element.text.trim());
        break;
      case "shot":
        current.action = current.action
          ? `${current.action}\n\n${element.text.trim()}`
          : element.text.trim();
        break;
      case "transition":
        break;
      default:
        break;
    }
  }

  if (current) scenes.push(current);
  return scenes;
}

export function deriveCharactersFromElements(elements: ScriptElement[]): ScriptCharacter[] {
  const names = new Set<string>();
  const characters: ScriptCharacter[] = [];

  for (const element of elements) {
    if (element.type !== "character") continue;
    const baseName = element.text.replace(/\([^)]*\)/g, "").trim();
    if (!baseName || names.has(baseName)) continue;
    names.add(baseName);
    characters.push({
      name: baseName,
      role: characters.length === 0 ? "lead" : "supporting",
    });
  }

  return characters;
}

export function applyElementsToScript(
  script: ScriptDocument,
  elements: ScriptElement[]
): ScriptDocument {
  const cleaned = assignSceneNumbers(removeEmptyElements(reindexElements(elements)));
  return normalizeScriptDocument({
    ...script,
    elements: cleaned,
    fountain: elementsToFountain(cleaned),
    scenes: deriveScenesFromElements(cleaned),
    characters: deriveCharactersFromElements(cleaned).length
      ? deriveCharactersFromElements(cleaned)
      : script.characters,
  });
}
