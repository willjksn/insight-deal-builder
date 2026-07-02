"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { detectElementType, normalizeElementText } from "@/lib/screenplay/detect";
import {
  createScriptElement,
  reindexElements,
} from "@/lib/screenplay/elements";
import {
  EDITABLE_SCRIPT_ELEMENT_TYPES,
  nextElementTypeAfterEnter,
  cycleElementType,
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
      next.splice(
        index + 1,
        0,
        createScriptElement(type, text, index + 1)
      );
      onChange(reindexElements(next));
      requestAnimationFrame(() => {
        const inserted = reindexElements(next)[index + 1];
        blockRefs.current.get(inserted.id)?.focus();
      });
    },
    [elements, onChange]
  );

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    element: ScriptElement,
    index: number
  ) => {
    const isMod = event.metaKey || event.ctrlKey;

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
      const nextType = cycleElementType(element.type, event.shiftKey ? "backward" : "forward");
      updateElement(element.id, {
        type: nextType,
        text: normalizeElementText(nextType, element.text),
      });
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const nextType = nextElementTypeAfterEnter(element.type);
      insertAfter(index, nextType);
    }
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
          Enter moves to the next element type. Tab / Shift+Tab change format. Cmd/Ctrl+1–7 jump to
          Scene Heading, Action, Character, Dialogue, Parenthetical, Transition, or Shot.
        </p>
      ) : null}
    </div>
  );
}
