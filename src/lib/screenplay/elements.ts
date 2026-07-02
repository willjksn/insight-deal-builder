import { detectElementType, normalizeElementText } from "@/lib/screenplay/detect";
import { ScriptElement, ScriptElementType } from "@/lib/screenplay/types";

export function createScriptElement(
  type: ScriptElementType,
  text: string,
  order: number,
  partial?: Partial<ScriptElement>
): ScriptElement {
  const now = new Date().toISOString();
  const element: ScriptElement = {
    id: partial?.id ?? crypto.randomUUID(),
    type,
    text: normalizeElementText(type, text),
    order,
    createdAt: partial?.createdAt ?? now,
    updatedAt: now,
  };
  if (partial?.sceneNumber != null) {
    element.sceneNumber = partial.sceneNumber;
  }
  if (partial?.pageNumber != null) {
    element.pageNumber = partial.pageNumber;
  }
  return element;
}

export function reindexElements(elements: ScriptElement[]): ScriptElement[] {
  return elements.map((element, index) => ({
    ...element,
    order: index,
  }));
}

export function assignSceneNumbers(elements: ScriptElement[]): ScriptElement[] {
  let sceneNumber = 0;
  return elements.map((element) => {
    if (element.type === "scene_heading") {
      sceneNumber += 1;
      return { ...element, sceneNumber };
    }
    if (sceneNumber > 0) {
      return { ...element, sceneNumber };
    }
    return element;
  });
}

export function removeEmptyElements(elements: ScriptElement[]): ScriptElement[] {
  return elements.filter((element) => element.text.trim().length > 0);
}

export function parseRawElements(
  raw: unknown,
  fallbackTitle?: string
): ScriptElement[] | null {
  if (!Array.isArray(raw)) return null;

  const parsed: ScriptElement[] = [];
  let previousType: ScriptElementType | undefined;

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] as { type?: string; text?: string; id?: string };
    const text = typeof item.text === "string" ? item.text.trim() : "";
    if (!text) continue;

    const type =
      isScriptElementType(item.type) ? item.type : detectElementType(text, previousType);

    parsed.push(
      createScriptElement(type, text, parsed.length, {
        id: typeof item.id === "string" ? item.id : undefined,
      })
    );
    previousType = type;
  }

  if (parsed.length === 0 && fallbackTitle) {
    parsed.push(createScriptElement("scene_heading", "INT. LOCATION - DAY", 0));
    parsed.push(createScriptElement("action", fallbackTitle, 1));
  }

  return parsed.length > 0 ? assignSceneNumbers(reindexElements(parsed)) : null;
}

function isScriptElementType(value: unknown): value is ScriptElementType {
  return (
    value === "scene_heading" ||
    value === "action" ||
    value === "character" ||
    value === "dialogue" ||
    value === "parenthetical" ||
    value === "transition" ||
    value === "shot" ||
    value === "note"
  );
}
