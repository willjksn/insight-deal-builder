import { stripUndefined } from "@/lib/firebase/firestore";
import { ScriptDocument } from "@/lib/scriptWriter/types";
import { ScriptElement } from "@/lib/screenplay/types";

/** Firestore-safe element — omits optional fields when unset. */
export function serializeScriptElement(element: ScriptElement): ScriptElement {
  const base: ScriptElement = {
    id: element.id,
    type: element.type,
    text: element.text,
    order: element.order,
    createdAt: element.createdAt,
    updatedAt: element.updatedAt,
  };
  if (element.sceneNumber != null) {
    base.sceneNumber = element.sceneNumber;
  }
  if (element.pageNumber != null) {
    base.pageNumber = element.pageNumber;
  }
  return base;
}

export function serializeScriptElements(elements: ScriptElement[] | undefined): ScriptElement[] | undefined {
  if (!elements?.length) return elements?.length === 0 ? [] : undefined;
  return elements.map(serializeScriptElement);
}

/** Strip undefined nested values before Admin SDK writes. */
export function prepareScriptDocumentForFirestore(script: ScriptDocument): ScriptDocument {
  return stripUndefined({
    ...script,
    elements: serializeScriptElements(script.elements),
  }) as ScriptDocument;
}
