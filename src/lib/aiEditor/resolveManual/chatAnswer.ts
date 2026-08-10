import { callGeminiJsonWithHistory } from "@/lib/ai/geminiClient";
import { ensureResolveManualIndex } from "@/lib/aiEditor/resolveManual/indexStore";
import { retrieveManualChunks } from "@/lib/aiEditor/resolveManual/retrieve";
import type {
  ResolveManualChatMessage,
  ResolveManualChatResult,
  ResolveManualCitation,
} from "@/lib/aiEditor/resolveManual/types";

const SYSTEM = `You are a patient DaVinci Resolve editing coach inside ShootSpine.
Teach using ONLY the provided excerpts from the official DaVinci Resolve Reference Manual.

Write a DETAILED coaching reply for a working editor (not a one-liner):
1) "answer": 1 short paragraph (4–8 sentences) that orients the user — what this feature is for, which page/workspace in Resolve to be on, and what success looks like.
2) "steps": 6–14 concrete numbered actions. Each step should name the UI location when the excerpts do (page, panel, menu, button). Prefer “Go to X → open Y → click Z” style. Include setup/prerequisites if the excerpts mention them.
3) "tips": 2–5 practical tips, warnings, or common gotchas that appear in the excerpts (or clearly implied by them). Skip tips that invent features.
4) "citationPages": 2–4 PDF page numbers that best match the procedure (ShootSpine shows those page images with figures).

Rules:
- Do not invent menus, panels, or shortcuts that are not supported by the excerpts.
- Do not dump raw manual paragraphs verbatim; rewrite as clear coach language.
- If the excerpts only partially cover the question, say what you can cover from the manual and what to check on the cited pages.
- Return JSON only:
{
  "answer": "...",
  "steps": ["...", "..."],
  "tips": ["...", "..."],
  "citationPages": [777, 779]
}`;

function excerptForCitation(text: string, max = 320): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function uniquePageCitations(
  scored: { chunk: { id: string; page: number; text: string } }[],
  limit = 4
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

function extractStepsFromText(text: string, limit = 12): string[] {
  const steps: string[] = [];
  const cleaned = text.replace(/\s+/g, " ").trim();

  const numbered = cleaned.match(/\b\d{1,2}[.)]\s+[A-Z][^.?!]{18,220}[.?!]/g) || [];
  for (const m of numbered) {
    const s = m.replace(/^\d{1,2}[.)]\s+/, "").trim();
    if (s.length > 18) steps.push(s);
    if (steps.length >= limit) return steps;
  }

  // Bullet-like fragments in Resolve manuals often use "To …:"
  const toMatches = cleaned.match(/\bTo\s+[^.?!]{12,200}[.?!]/gi) || [];
  for (const m of toMatches) {
    const s = m.replace(/^To\s+/i, "").trim();
    if (s.length > 15) steps.push(s.charAt(0).toUpperCase() + s.slice(1));
    if (steps.length >= limit) return steps;
  }

  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    if (
      /\b(click|choose|select|drag|press|open|go to|from the|use the|double-click|right-click|navigate|enable|disable|toggle)\b/i.test(
        s
      ) &&
      s.length > 24 &&
      s.length < 280
    ) {
      steps.push(s.trim());
    }
    if (steps.length >= limit) break;
  }
  return steps;
}

function extractTipsFromText(text: string, limit = 4): string[] {
  const tips: string[] = [];
  const cleaned = text.replace(/\s+/g, " ").trim();
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    if (
      /\b(note|tip|important|you can also|alternatively|make sure|ensure|if you|shortcut|hold|right-click|option|preference)\b/i.test(
        s
      ) &&
      s.length > 40 &&
      s.length < 260
    ) {
      tips.push(s.trim());
    }
    if (tips.length >= limit) break;
  }
  return tips;
}

function localAnswer(
  question: string,
  scored: ReturnType<typeof retrieveManualChunks>,
  manualLabel: string
): ResolveManualChatResult {
  const citations = uniquePageCitations(scored, 4);
  if (!citations.length) {
    return {
      answer:
        "I couldn’t find that in the indexed Resolve manual. Try different words (e.g. “cross dissolve”, “Color page nodes”, “render queue”).",
      steps: [],
      tips: [],
      citations: [],
      mode: "excerpts_only",
      manualLabel,
      pageCount: null,
    };
  }

  const pages = citations.map((c) => c.page);
  const fullText = scored.map((s) => s.chunk.text).join("\n");
  const steps = extractStepsFromText(fullText, 12);
  const tips = extractTipsFromText(fullText, 4);

  const topic = question.replace(/\?+$/, "").trim() || "that";
  const overviewBits = scored
    .slice(0, 3)
    .map((s) => s.chunk.text.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const overview =
    overviewBits.length > 0
      ? overviewBits.join(" ").slice(0, 700).trim()
      : "";

  const answer = [
    `Here’s a fuller walkthrough for ${topic.toLowerCase().replace(/^how (do i|to)\s+/i, "")} from the ${manualLabel}.`,
    overview
      ? `From the matching pages: ${overview}${overview.length >= 680 ? "…" : ""}`
      : null,
    `Use the numbered steps below, then open the manual page images (PDF pages ${pages.join(", ")}) for the official figures and any extra context on those screens.`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    answer,
    steps: steps.length
      ? steps
      : [
          "Open the matching workspace in DaVinci Resolve (Edit, Cut, Color, Fusion, Fairlight, or Deliver — based on the page images).",
          `Open PDF page ${pages[0]} in the images below and follow the illustrated procedure step by step.`,
          pages[1]
            ? `If the first page is incomplete, continue on PDF page ${pages[1]} — related controls are often on the next pages.`
            : "Zoom the page image if the UI labels are small.",
        ],
    tips: tips.length
      ? tips
      : [
          "Match panel names in the steps to what you see in Resolve — Blackmagic’s wording in the manual is usually exact.",
          "If a control isn’t visible, check you are on the correct page (Edit/Cut/Color/etc.) shown in the citation images.",
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
      tips: [],
      citations: [],
      mode: "index_missing",
      manualLabel: null,
      pageCount: null,
    };
  }

  const index = await ensureResolveManualIndex();
  if (!index) {
    const isDeployedHost =
      process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
    return {
      answer: isDeployedHost
        ? "The Resolve Reference Manual isn’t available on this server yet. The searchable index is built on a local machine and isn’t part of the normal web deploy — ask a ShootSpine admin to provision it, or use Resolve assistant where the manual has already been indexed."
        : 'The Resolve manual isn’t indexed on this computer yet. Run: py -3 scripts/index-resolve-manual.py "C:\\path\\to\\DaVinci Resolve.pdf" — then ask again.',
      steps: isDeployedHost
        ? [
            "On a development machine, index the official DaVinci Resolve Reference Manual PDF.",
            "Upload the index: npm run upload-resolve-manual-index",
            "Redeploy (or wait for the next build). Refresh and ask again.",
          ]
        : [
            "Place the official DaVinci Resolve Reference Manual PDF on this PC.",
            "From the project folder run the index script (see docs / package script).",
            "Refresh this page and ask your question.",
          ],
      tips: [],
      citations: [],
      mode: "index_missing",
      manualLabel: null,
      pageCount: null,
    };
  }

  const scored = retrieveManualChunks(index.chunks, message, 14);
  const manualLabel = index.manifest.manualLabel || "DaVinci Resolve Reference Manual";

  if (!scored.length) {
    return { ...localAnswer(message, scored, manualLabel), pageCount: index.manifest.pageCount };
  }

  if (input.preferLocal) {
    const local = localAnswer(message, scored, manualLabel);
    return { ...local, pageCount: index.manifest.pageCount };
  }

  const contextBlock = scored
    .slice(0, 12)
    .map((s, i) => `[Excerpt ${i + 1} | PDF page ${s.chunk.page}]\n${s.chunk.text}`)
    .join("\n\n---\n\n");

  const historyBlock = (input.history || [])
    .slice(-8)
    .map((m) => `${m.role === "user" ? "User" : "Coach"}: ${m.content}`)
    .join("\n");

  const fallback = localAnswer(message, scored, manualLabel);

  try {
    const raw = await callGeminiJsonWithHistory(
      SYSTEM,
      [
        {
          role: "user",
          parts: [
            {
              text: [
                `Manual: ${manualLabel} (${index.manifest.pageCount} pages indexed).`,
                "Be thorough. The UI will show screenshot images of the citationPages — pick the 2–4 most useful pages.",
                historyBlock ? `Recent chat:\n${historyBlock}` : "",
                `User question:\n${message}`,
                `\nManual excerpts (source of truth):\n${contextBlock}`,
              ]
                .filter(Boolean)
                .join("\n\n"),
            },
          ],
        },
      ],
      { temperature: 0.35, maxOutputTokens: 4096 }
    );

    const obj = (raw && typeof raw === "object" ? raw : {}) as {
      answer?: string;
      steps?: string[];
      tips?: string[];
      citationPages?: number[];
    };
    const answer =
      typeof obj.answer === "string" && obj.answer.trim()
        ? obj.answer.trim()
        : fallback.answer;
    const steps = Array.isArray(obj.steps)
      ? obj.steps
          .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          .map((s) => s.trim())
          .slice(0, 14)
      : [];
    const tips = Array.isArray(obj.tips)
      ? obj.tips
          .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          .map((s) => s.trim())
          .slice(0, 6)
      : fallback.tips || [];

    let citations = uniquePageCitations(scored, 4);
    if (Array.isArray(obj.citationPages) && obj.citationPages.length) {
      const wanted = obj.citationPages
        .filter((n): n is number => typeof n === "number")
        .slice(0, 4);
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
      tips: tips.length ? tips : fallback.tips,
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
