"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { detectElementType, normalizeElementText } from "@/lib/screenplay/detect";
import {
  createScriptElement,
  reindexElements,
} from "@/lib/screenplay/elements";
import {
  deleteEmptyElement,
  looksLikeScreenplayPaste,
  mergeElementWithPrevious,
  nextTypeAfterEmptyEnter,
  pasteScreenplayAt,
  pasteScreenplayReplacingSelection,
} from "@/lib/screenplay/editorActions";
import {
  EDITABLE_SCRIPT_ELEMENT_TYPES,
  nextElementTypeAfterEnter,
  tabElementType,
  SCRIPT_ELEMENT_HINTS,
  SCRIPT_ELEMENT_LABELS,
  SCRIPT_ELEMENT_PLACEHOLDERS,
  ScriptElement,
  ScriptElementType,
} from "@/lib/screenplay/types";
import { Select } from "@/components/ui/Select";

interface ScreenplayEditorProps {
  elements: ScriptElement[];
  onChange: (elements: ScriptElement[]) => void;
  readOnly?: boolean;
}

function autoResize(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight + 2}px`;
}

function focusBlock(
  refs: Map<string, HTMLTextAreaElement>,
  id: string,
  caret?: number
) {
  requestAnimationFrame(() => {
    const node = refs.get(id);
    if (!node) return;
    node.focus();
    const pos = caret == null ? node.value.length : Math.min(caret, node.value.length);
    node.setSelectionRange(pos, pos);
    autoResize(node);
  });
}

export function ScreenplayEditor({
  elements,
  onChange,
  readOnly,
}: ScreenplayEditorProps) {
  const blockRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  const updateElement = useCallback(
    (id: string, patch: Partial<ScriptElement>) => {
      onChange(
        reindexElements(
          elements.map((element) =>
            element.id === id
              ? { ...element, ...patch, updatedAt: new Date().toISOString() }
              : element
          )
        )
      );
    },
    [elements, onChange]
  );

  const insertAfter = useCallback(
    (index: number, type: ScriptElementType, text = "") => {
      const next = [...elements];
      next.splice(index + 1, 0, createScriptElement(type, text, index + 1));
      const reindexed = reindexElements(next);
      onChange(reindexed);
      focusBlock(blockRefs.current, reindexed[index + 1].id, 0);
    },
    [elements, onChange]
  );

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    element: ScriptElement,
    index: number
  ) => {
    const isMod = event.metaKey || event.ctrlKey;
    const ta = event.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    if (isMod && event.key >= "1" && event.key <= "7") {
      event.preventDefault();
      const type = EDITABLE_SCRIPT_ELEMENT_TYPES[Number(event.key) - 1];
      if (type) {
        updateElement(element.id, {
          type,
          text: normalizeElementText(type, element.text),
        });
      }
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const nextType = tabElementType(element.type, event.shiftKey ? "backward" : "forward");
      updateElement(element.id, {
        type: nextType,
        text: normalizeElementText(nextType, element.text),
      });
      return;
    }

    // Cmd/Ctrl+Enter — always start a new Action block (FD "force action")
    if (event.key === "Enter" && isMod) {
      event.preventDefault();
      insertAfter(index, "action");
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!element.text.trim()) {
        const emptyNext = nextTypeAfterEmptyEnter(element.type);
        if (emptyNext) {
          insertAfter(index, emptyNext);
          return;
        }
      }
      const nextType = nextElementTypeAfterEnter(element.type);
      insertAfter(index, nextType);
      return;
    }

    if (event.key === "ArrowUp" && start === 0 && end === 0 && index > 0) {
      event.preventDefault();
      const prev = elements[index - 1];
      focusBlock(blockRefs.current, prev.id, prev.text.length);
      return;
    }

    if (
      event.key === "ArrowDown" &&
      start === ta.value.length &&
      end === ta.value.length &&
      index < elements.length - 1
    ) {
      event.preventDefault();
      focusBlock(blockRefs.current, elements[index + 1].id, 0);
      return;
    }

    if (event.key === "Backspace" && start === 0 && end === 0) {
      if (!element.text.trim()) {
        const result = deleteEmptyElement(elements, index);
        if (result) {
          event.preventDefault();
          onChange(result.elements);
          focusBlock(blockRefs.current, result.focusId, result.caret);
        }
        return;
      }
      const result = mergeElementWithPrevious(elements, index);
      if (result) {
        event.preventDefault();
        onChange(result.elements);
        focusBlock(blockRefs.current, result.focusId, result.caret);
      }
    }
  };

  const handlePaste = (
    event: React.ClipboardEvent<HTMLTextAreaElement>,
    index: number
  ) => {
    if (readOnly) return;
    const text = event.clipboardData.getData("text/plain");
    if (!looksLikeScreenplayPaste(text)) return;
    event.preventDefault();
    const ta = event.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start !== end) {
      onChange(pasteScreenplayReplacingSelection(elements, index, start, end, text));
      return;
    }
    onChange(pasteScreenplayAt(elements, index, text));
  };

  useEffect(() => {
    for (const textarea of blockRefs.current.values()) {
      autoResize(textarea);
    }
  }, [elements]);

  return (
    <div className="screenplay-workspace rounded-2xl border border-slate-200 bg-slate-100 p-4">
      <div className="mx-auto max-w-[8.5in] space-y-2">
        {elements.map((element, index) => {
          const previousType = index > 0 ? elements[index - 1].type : undefined;
          return (
            <div
              key={element.id}
              className="screenplay-editor-block rounded bg-white px-3 py-2"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Select
                  value={element.type}
                  disabled={readOnly}
                  wrapperClassName="w-auto shrink-0"
                  onChange={(event) => {
                    const type = event.target.value as ScriptElementType;
                    updateElement(element.id, {
                      type,
                      text: normalizeElementText(type, element.text),
                    });
                  }}
                  className="h-auto min-h-9 w-auto min-w-[11rem] py-1.5 text-xs leading-normal"
                  options={EDITABLE_SCRIPT_ELEMENT_TYPES.map((type) => ({
                    value: type,
                    label: SCRIPT_ELEMENT_LABELS[type],
                  }))}
                />
                <span className="text-[11px] leading-normal text-slate-500">
                  {SCRIPT_ELEMENT_HINTS[element.type]}
                </span>
              </div>
              <textarea
                ref={(node) => {
                  if (node) blockRefs.current.set(element.id, node);
                  else blockRefs.current.delete(element.id);
                }}
                readOnly={readOnly}
                rows={1}
                value={element.text}
                placeholder={SCRIPT_ELEMENT_PLACEHOLDERS[element.type]}
                className={cn(
                  "min-h-[1.5rem] w-full py-1 leading-normal",
                  element.type === "scene_heading" ||
                    element.type === "character" ||
                    element.type === "transition" ||
                    element.type === "shot"
                    ? "uppercase"
                    : ""
                )}
                onChange={(event) => {
                  const raw = event.target.value;
                  autoResize(event.target);
                  updateElement(element.id, { text: raw });
                }}
                onBlur={(event) => {
                  const detected = detectElementType(event.target.value, previousType);
                  updateElement(element.id, {
                    type: detected,
                    text: normalizeElementText(detected, event.target.value),
                  });
                }}
                onKeyDown={(event) => handleKeyDown(event, element, index)}
                onPaste={(event) => handlePaste(event, index)}
              />
            </div>
          );
        })}

        {!readOnly ? (
          <button
            type="button"
            className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-600 hover:border-sky-300 hover:text-sky-700"
            onClick={() => insertAfter(elements.length - 1, "action")}
          >
            + Add screenplay line
          </button>
        ) : null}
      </div>

      {!readOnly ? (
        <p className="mx-auto mt-4 max-w-[8.5in] text-xs text-slate-500">
          Enter = next block · empty Dialogue Enter = next Character · Cmd/Ctrl+Enter = Action ·
          Shift+Enter = line break · Tab = Character→Dialogue→Parenthetical spine · ↑/↓ at edges ·
          Backspace merges · Paste Fountain (selection-aware) · Cmd/Ctrl+1–7 type jump.
        </p>
      ) : null}
    </div>
  );
}
