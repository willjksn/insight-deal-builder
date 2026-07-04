import jsPDF from "jspdf";
import { APP_NAME } from "@/lib/brand";
import { shotListDetailRows, shotListTitle } from "@/lib/scriptWriter/shotListDisplay";
import { ScriptDocument } from "@/lib/scriptWriter/types";
import { getScriptElements } from "@/lib/screenplay/normalize";
import { paginateScreenplay } from "@/lib/screenplay/paginate";
import {
  SCREENPLAY_ACTION,
  SCREENPLAY_DIALOGUE,
  SCREENPLAY_PAGE,
  SCREENPLAY_PARENTHETICAL,
  SCREENPLAY_SPACING_AFTER,
  SCREENPLAY_TYPE,
} from "@/lib/screenplay/layout";
import { ScriptElement, ScriptElementType, ScreenplayExportOptions } from "@/lib/screenplay/types";
import { elementsToPlainText } from "@/lib/screenplay/fountain";

const { width: PAGE_WIDTH, height: PAGE_HEIGHT, marginTop: MARGIN_TOP, marginBottom: MARGIN_BOTTOM, marginRight: MARGIN_RIGHT } =
  SCREENPLAY_PAGE;
const { fontSize: FONT_SIZE, lineHeight: LINE_HEIGHT } = SCREENPLAY_TYPE;

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 80) || "screenplay";
}

function setCourier(doc: jsPDF, size: number = FONT_SIZE) {
  doc.setFont("courier", "normal");
  doc.setFontSize(size);
  doc.setTextColor(0, 0, 0);
}

function drawPageNumber(doc: jsPDF, pageNumber: number, show: boolean) {
  if (!show || pageNumber < 1) return;
  setCourier(doc);
  doc.text(String(pageNumber), PAGE_WIDTH - MARGIN_RIGHT, 36, { align: "right" });
}

function drawLines(
  doc: jsPDF,
  lines: string[],
  x: number,
  y: number,
  maxWidth: number,
  align: "left" | "center" | "right" = "left"
): number {
  for (const line of lines) {
    if (align === "center") {
      doc.text(line, x, y, { align: "center" });
    } else if (align === "right") {
      doc.text(line, x, y, { align: "right" });
    } else {
      doc.text(line, x, y);
    }
    y += LINE_HEIGHT;
  }
  return y;
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

function spacingAfter(type: ScriptElementType): number {
  return SCREENPLAY_SPACING_AFTER[type] ?? 0;
}

function drawElement(doc: jsPDF, element: ScriptElement, y: number, previousType?: ScriptElementType): number {
  const text = element.text.trim();
  if (!text) return y;

  if (element.type === "scene_heading" && previousType) {
    y += LINE_HEIGHT;
  }

  setCourier(doc);

  switch (element.type) {
    case "scene_heading":
      y = drawLines(doc, wrapText(doc, text.toUpperCase(), SCREENPLAY_ACTION.width), SCREENPLAY_ACTION.left, y, SCREENPLAY_ACTION.width);
      return y + spacingAfter("scene_heading");
    case "action":
      y = drawLines(doc, wrapText(doc, text, SCREENPLAY_ACTION.width), SCREENPLAY_ACTION.left, y, SCREENPLAY_ACTION.width);
      return y + spacingAfter("action");
    case "character":
      y = drawLines(
        doc,
        wrapText(doc, text.toUpperCase(), SCREENPLAY_DIALOGUE.width),
        SCREENPLAY_DIALOGUE.center,
        y,
        SCREENPLAY_DIALOGUE.width,
        "center"
      );
      return y;
    case "parenthetical":
      y = drawLines(
        doc,
        wrapText(doc, text, SCREENPLAY_PARENTHETICAL.width),
        SCREENPLAY_PARENTHETICAL.left,
        y,
        SCREENPLAY_PARENTHETICAL.width
      );
      return y;
    case "dialogue":
      y = drawLines(
        doc,
        wrapText(doc, text, SCREENPLAY_DIALOGUE.width),
        SCREENPLAY_DIALOGUE.left,
        y,
        SCREENPLAY_DIALOGUE.width
      );
      return y + spacingAfter("dialogue");
    case "transition":
      y = drawLines(
        doc,
        wrapText(doc, text.toUpperCase(), SCREENPLAY_ACTION.width),
        SCREENPLAY_ACTION.left + SCREENPLAY_ACTION.width,
        y,
        SCREENPLAY_ACTION.width,
        "right"
      );
      return y + spacingAfter("transition");
    case "shot":
      y = drawLines(doc, wrapText(doc, text.toUpperCase(), SCREENPLAY_ACTION.width), SCREENPLAY_ACTION.left, y, SCREENPLAY_ACTION.width);
      return y + spacingAfter("shot");
    case "note":
      y = drawLines(doc, wrapText(doc, `[NOTE] ${text}`, SCREENPLAY_ACTION.width), SCREENPLAY_ACTION.left, y, SCREENPLAY_ACTION.width);
      return y + LINE_HEIGHT;
    default:
      return y;
  }
}

function drawTitleBlock(doc: jsPDF, script: ScriptDocument, y: number): number {
  setCourier(doc);
  doc.text(script.title.toUpperCase(), PAGE_WIDTH / 2, y, { align: "center" });
  y += LINE_HEIGHT * 2;
  if (script.author?.trim()) {
    doc.text(`by ${script.author.trim()}`, PAGE_WIDTH / 2, y, { align: "center" });
    y += LINE_HEIGHT * 2;
  }
  if (script.draftLabel?.trim()) {
    doc.text(script.draftLabel.trim(), PAGE_WIDTH / 2, y, { align: "center" });
    y += LINE_HEIGHT * 2;
  }
  return y + LINE_HEIGHT;
}

export function getScreenplayPdfFilename(script: ScriptDocument, suffix = "screenplay"): string {
  return `${sanitizeFilename(script.title)}-${suffix}.pdf`;
}

export function downloadScreenplayPdf(
  script: ScriptDocument,
  options?: ScreenplayExportOptions
): void {
  const includeNotes = options?.includeNotes ?? false;
  const showPageOneNumber = options?.showPageOneNumber ?? false;
  const includeTitlePage = options?.includeTitlePage ?? false;
  const elements = getScriptElements(script).filter(
    (element) => includeNotes || element.type !== "note"
  );

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  let pageNumber = 0;

  const startPage = (showNumber: boolean): number => {
    if (pageNumber > 0) doc.addPage();
    pageNumber += 1;
    drawPageNumber(doc, pageNumber, showNumber && (pageNumber > 1 || showPageOneNumber));
    return MARGIN_TOP;
  };

  if (includeTitlePage) {
    startPage(false);
    drawTitleBlock(doc, script, PAGE_HEIGHT / 3);
  }

  let y: number = startPage(!includeTitlePage && showPageOneNumber);
  if (!includeTitlePage && script.title && elements[0]?.type !== "scene_heading") {
    y = drawTitleBlock(doc, script, y);
  }

  let previousType: ScriptElementType | undefined;

  for (const element of elements) {
    const needed = LINE_HEIGHT * 4;
    if (y + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
      y = startPage(true);
      previousType = undefined;
    }
    y = drawElement(doc, element, y, previousType);
    previousType = element.type;
  }

  doc.save(getScreenplayPdfFilename(script));
}

export function downloadScreenplayText(
  script: ScriptDocument,
  options?: ScreenplayExportOptions
): void {
  const text = elementsToPlainText(getScriptElements(script), {
    includeNotes: options?.includeNotes,
  });
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${sanitizeFilename(script.title)}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
    doc.addPage();
    setCourier(doc, 10);
    doc.setTextColor(100, 116, 139);
    doc.text(APP_NAME, SCREENPLAY_PAGE.marginLeft, 48);
    doc.setTextColor(0, 0, 0);
    return MARGIN_TOP + 12;
  }
  return y;
}

export function downloadProductionPackPdf(script: ScriptDocument): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const contentWidth = PAGE_WIDTH - SCREENPLAY_PAGE.marginLeft - SCREENPLAY_PAGE.marginRight;
  let y: number = MARGIN_TOP;

  setCourier(doc, 16);
  doc.text(script.title, SCREENPLAY_PAGE.marginLeft, y);
  y += 22;
  setCourier(doc, 9);
  doc.setTextColor(14, 165, 233);
  doc.text(`${APP_NAME} · Production pack`, SCREENPLAY_PAGE.marginLeft, y);
  doc.setTextColor(0, 0, 0);
  y += 20;

  if (script.logline) {
    setCourier(doc, 11);
    y = drawLines(doc, wrapText(doc, script.logline, contentWidth), SCREENPLAY_PAGE.marginLeft, y, contentWidth);
    y += 8;
  }

  const addHeading = (label: string) => {
    y = ensureSpace(doc, y, 28);
    y += 8;
    setCourier(doc, 11);
    doc.setFont("courier", "bold");
    doc.text(label.toUpperCase(), SCREENPLAY_PAGE.marginLeft, y);
    doc.setFont("courier", "normal");
    y += 16;
  };

  const addBody = (text: string) => {
    setCourier(doc, 10);
    y = drawLines(doc, wrapText(doc, text, contentWidth), SCREENPLAY_PAGE.marginLeft, y, contentWidth);
    y += 6;
  };

  const addLines = (items: string[]) => {
    setCourier(doc, 10);
    for (const item of items) {
      y = ensureSpace(doc, y, LINE_HEIGHT);
      y = drawLines(doc, wrapText(doc, `• ${item}`, contentWidth - 12), SCREENPLAY_PAGE.marginLeft + 8, y, contentWidth - 12);
    }
    y += 4;
  };

  const pack = script.productionPack;
  if (pack?.premise) {
    addHeading("Premise");
    addBody(pack.premise);
  }
  if (pack?.tone) {
    addHeading("Tone");
    addBody(pack.tone);
  }
  if (pack?.props?.length) {
    addHeading("Props");
    addLines(pack.props);
  }
  if (pack?.locationNotes?.length) {
    addHeading("Locations");
    addLines(pack.locationNotes);
  }
  if (pack?.soundDesign?.length) {
    addHeading("Sound");
    addLines(pack.soundDesign);
  }
  if (script.suggestedShots?.length) {
    addHeading("Shot list");
    for (const shot of script.suggestedShots) {
      y = ensureSpace(doc, y, LINE_HEIGHT * 3);
      setCourier(doc, 10);
      y = drawLines(
        doc,
        wrapText(doc, shotListTitle(shot), contentWidth),
        SCREENPLAY_PAGE.marginLeft,
        y,
        contentWidth
      );
      for (const row of shotListDetailRows(shot)) {
        y = ensureSpace(doc, y, LINE_HEIGHT * 2);
        setCourier(doc, 9);
        y = drawLines(
          doc,
          wrapText(doc, `${row.label}: ${row.value}`, contentWidth),
          SCREENPLAY_PAGE.marginLeft,
          y,
          contentWidth
        );
      }
      y += LINE_HEIGHT * 0.5;
    }
  }

  setCourier(doc, 8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated by ${APP_NAME}`, SCREENPLAY_PAGE.marginLeft, PAGE_HEIGHT - 48);

  doc.save(getScreenplayPdfFilename(script, "production-pack"));
}

export function downloadScriptAndShotListPdf(script: ScriptDocument): void {
  downloadScreenplayPdf(script);
  downloadProductionPackPdf(script);
}
