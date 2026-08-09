import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { loadResolveManualIndex } from "@/lib/aiEditor/resolveManual/indexStore";
import { retrieveManualChunks } from "@/lib/aiEditor/resolveManual/retrieve";
import type {
  ResolveManualChatMessage,
  ResolveManualChatResult,
  ResolveManualCitation,
} from "@/lib/aiEditor/resolveManual/types";

const SYSTEM = `You are a DaVinci Resolve editing coach inside ShootSpine.
Teach beginners using ONLY the provided excerpts from the official DaVinci Resolve Reference Manual.
Write a short friendly answer (2–4 sentences), then concrete numbered steps the user can do in Resolve right now.
Do not dump raw manual paragraphs. Do not invent menus that are not in the excerpts.
Mention which PDF page(s) have the screenshots/figures (ShootSpine will show those page images).
Return JSON only:
{
  "answer": "short friendly overview",
  "steps": ["Go to the Edit page", "Open Effects Library → Video Transitions → Dissolve", "..."],
  "citationPages": [777, 779]
}`;

function excerptForCitation(text: string, max = 220): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function uniquePageCitations(
  scored: { chunk: { id: string; page: number; text: string } }[],
  limit = 3
): ResolveManualCitation[] {
  const seen = new Set<number>();
  const out: ResolveManualCitation[] = [];
  for (const s of scored) {
    if (seen.has(s.chunk.page)) continue;
    seen.add(s.chunk.page);
    out.push({
      page: s.chunk.page,
      excerpt: excerptForCitation(s.chunk.text),
      chunkId: s.chunk.id,
    });
    if (out.length >= limit) break;
  }
  return out;
}

function extractStepsFromText(text: string, limit = 8): string[] {
  const steps: string[] = [];
  const cleaned = text.replace(/\s+/g, " ").trim();

  // Bullet-like fragments in Resolve manuals often use "To …:"
  const toMatches = cleaned.match(/\bTo\s+[^.?!]{12,160}[.?!]/gi) || [];
  for (const m of toMatches) {
    const s = m.replace(/^To\s+/i, "").trim();
    if (s.length > 15) steps.push(s.charAt(0).toUpperCase() + s.slice(1));
    if (steps.length >= limit) return steps;
  }

  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    if (
      /\b(click|choose|select|drag|press|open|go to|from the|use the|double-click|right-click)\b/i.test(
        s
      ) &&
      s.length > 24 &&
      s.length < 200
    ) {
      steps.push(s.trim());
    }
    if (steps.length >= limit) break;
  }
  return steps;
}

function localAnswer(
  question: string,
  scored: ReturnType<typeof retrieveManualChunks>,
  manualLabel: string
): ResolveManualChatResult {
  const citations = uniquePageCitations(scored, 3);
  if (!citations.length) {
    return {
      answer:
        "I couldn’t find that in the indexed Resolve manual. Try different words (e.g. “cross dissolve”, “Color page nodes”, “render queue”).",
      steps: [],
      citations: [],
      mode: "excerpts_only",
      manualLabel,
      pageCount: null,
    };
  }

  const pages = citations.map((c) => c.page);
  const fullText = scored
    .filter((s) => pages.includes(s.chunk.page))
    .map((s) => s.chunk.text)
    .join("\n");
  const steps = extractStepsFromText(fullText, 8);

  const topic = question.replace(/\?+$/, "").trim() || "that";
  const answer = [
    `Here’s how to ${topic.toLowerCase().replace(/^how (do i|to)\s+/i, "")} according to the ${manualLabel}.`,
    `Follow the steps below, then look at the manual page images (PDF pages ${pages.join(", ")}) — those include the figures/screenshots from Blackmagic’s book.`,
  ].join(" ");

  return {
    answer,
    steps: steps.length
      ? steps
      : [
          "Open the Edit page in DaVinci Resolve.",
          `Jump to PDF page ${pages[0]} in the images below and follow the illustrated procedure there.`,
        ],
    citations,
    mode: "excerpts_only",
    manualLabel,
    pageCount: null,
  };
}

export async function answerResolveManualChat(input: {
  message: string;
  history?: ResolveManualChatMessage[];
  preferLocal?: boolean;
}): Promise<ResolveManualChatResult> {
  const message = String(input.message || "").trim();
  if (!message) {
    return {
      answer: "Ask how to do something in DaVinci Resolve — I’ll answer from the official manual.",
      steps: [],
      citations: [],
      mode: "index_missing",
      manualLabel: null,
      pageCount: null,
    };
  }

  const index = loadResolveManualIndex();
  if (!index) {
    return {
      answer:
        "The Resolve manual isn’t indexed on this computer yet. Run: py -3 scripts/index-resolve-manual.py \"C:\\path\\to\\DaVinci Resolve.pdf\" — then ask again.",
      steps: [
        "Place the official DaVinci Resolve Reference Manual PDF on this PC.",
        "From the project folder run the index script (see docs / package script).",
        "Refresh this page and ask your question.",
      ],
      citations: [],
      mode: "index_missing",
      manualLabel: null,
      pageCount: null,
    };
  }

  const scored = retrieveManualChunks(index.chunks, message, 8);
  const manualLabel = index.manifest.manualLabel || "DaVinci Resolve Reference Manual";

  if (!scored.length) {
    return { ...localAnswer(message, scored, manualLabel), pageCount: index.manifest.pageCount };
  }

  if (input.preferLocal) {
    const local = localAnswer(message, scored, manualLabel);
    return { ...local, pageCount: index.manifest.pageCount };
  }

  const contextBlock = scored
    .slice(0, 6)
    .map((s, i) => `[Excerpt ${i + 1} | PDF page ${s.chunk.page}]\n${s.chunk.text}`)
    .join("\n\n---\n\n");

  const historyBlock = (input.history || [])
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "Coach"}: ${m.content}`)
    .join("\n");

  const fallback = localAnswer(message, scored, manualLabel);

  try {
    const raw = await callGeminiJsonText(
      SYSTEM,
      [
        `Manual: ${manualLabel} (${index.manifest.pageCount} pages indexed).`,
        "The UI will show screenshot images of the citationPages — pick the 1–3 most useful pages.",
        historyBlock ? `Recent chat:\n${historyBlock}` : "",
        `User question:\n${message}`,
        `\nManual excerpts (source of truth):\n${contextBlock}`,
      ]
        .filter(Boolean)
        .join("\n\n")
    );

    const obj = (raw && typeof raw === "object" ? raw : {}) as {
      answer?: string;
      steps?: string[];
      citationPages?: number[];
    };
    const answer =
      typeof obj.answer === "string" && obj.answer.trim()
        ? obj.answer.trim()
        : fallback.answer;
    const steps = Array.isArray(obj.steps)
      ? obj.steps.filter((s): s is string => typeof s === "string" && s.trim().length > 0).slice(0, 10)
      : [];

    let citations = uniquePageCitations(scored, 3);
    if (Array.isArray(obj.citationPages) && obj.citationPages.length) {
      const wanted = obj.citationPages.filter((n): n is number => typeof n === "number").slice(0, 3);
      const fromWanted: ResolveManualCitation[] = [];
      for (const page of wanted) {
        const hit = scored.find((s) => s.chunk.page === page);
        if (hit) {
          fromWanted.push({
            page,
            excerpt: excerptForCitation(hit.chunk.text),
            chunkId: hit.chunk.id,
          });
        } else {
          fromWanted.push({
            page,
            excerpt: `See PDF page ${page} in the image below.`,
            chunkId: `p${page}`,
          });
        }
      }
      if (fromWanted.length) citations = fromWanted;
    }

    return {
      answer,
      steps: steps.length ? steps : fallback.steps,
      citations,
      mode: "manual_grounded",
      manualLabel,
      pageCount: index.manifest.pageCount,
    };
  } catch {
    return {
      ...fallback,
      pageCount: index.manifest.pageCount,
      answer: `${fallback.answer} (Using manual text + page images — cloud phrasing unavailable.)`,
    };
  }
}
