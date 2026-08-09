"use client";

import { FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Minus,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  X,
  ZoomIn,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import {
  aiEditorResolveAssistantChat,
  aiEditorResolveAssistantStatus,
  type ResolveAssistantChatResult,
  type ResolveAssistantStatus,
} from "@/lib/aiEditor/apiClient";
import { isAiEditorEnabled } from "@/lib/aiEditor/featureFlag";
import { authHeaders } from "@/lib/scriptWriter/apiClient";
import { cn } from "@/lib/utils/cn";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  result?: ResolveAssistantChatResult;
};

const STARTERS = [
  "How do I add a cross dissolve transition?",
  "Where do I import media into bins?",
  "How do I make a first color pass?",
  "How do I export for YouTube?",
  "What is the Fairlight page for?",
];

function ManualPageLightbox({
  page,
  src,
  onClose,
}: {
  page: number;
  src: string;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1.25);
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(3, z + 0.25));
      if (e.key === "-") setZoom((z) => Math.max(0.75, z - 0.25));
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
        <h2 id={titleId} className="text-sm font-semibold">
          Manual PDF page {page} — scroll & zoom to read
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-white/10"
            onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[3.5rem] text-center text-xs tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-white/10"
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="ml-1 rounded-lg p-2 hover:bg-white/10"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`DaVinci Resolve Reference Manual page ${page}`}
          className="mx-auto bg-white shadow-2xl"
          style={{ width: `${Math.round(zoom * 100)}%`, maxWidth: "none" }}
        />
      </div>
    </div>
  );
}

function ManualPageImage({
  page,
  getToken,
}: {
  page: number;
  getToken: () => Promise<string | null>;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/ai-editor/resolve-assistant/page?page=${page}`, {
          headers: await authHeaders(getToken),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || res.statusText);
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setSrc(objectUrl);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load page image");
          setSrc(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [page, getToken]);

  return (
    <>
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-2.5 py-1.5">
          <p className="text-xs font-semibold text-sky-900">Manual PDF page {page}</p>
          <div className="flex items-center gap-2">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" /> : null}
            {src ? (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100"
              >
                <ZoomIn className="h-3 w-3" />
                Open large
              </button>
            ) : null}
          </div>
        </div>
        {src ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="block w-full bg-slate-100 text-left"
            title="Click to open large & zoom"
          >
            <div className="max-h-72 overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`DaVinci Resolve Reference Manual page ${page}`}
                className="w-full min-w-full"
              />
            </div>
            <p className="border-t border-slate-100 px-2.5 py-1.5 text-[11px] text-slate-500">
              Scroll inside · click for full-screen zoom
            </p>
          </button>
        ) : error ? (
          <p className="px-2.5 py-3 text-xs text-amber-800">{error}</p>
        ) : (
          <div className="flex h-40 items-center justify-center bg-slate-50 text-xs text-slate-400">
            Loading high-res page…
          </div>
        )}
      </div>
      {open && src ? (
        <ManualPageLightbox page={page} src={src} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

export function ResolveAssistantClient() {
  const { user, appUser } = useAuth();
  const getToken = useCallback(async () => (user ? user.getIdToken() : null), [user]);
  const [status, setStatus] = useState<ResolveAssistantStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);
  const [answerReady, setAnswerReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isAiEditorEnabled()) return;
    let cancelled = false;
    void (async () => {
      try {
        const s = await aiEditorResolveAssistantStatus(getToken);
        if (!cancelled) {
          setStatus(s);
          setStatusError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setStatusError(e instanceof Error ? e.message : "Could not load assistant status");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy, answerReady]);

  function clearChat() {
    setMessages([]);
    setInput("");
    setBusy(false);
    setAnswerReady(false);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setAnswerReady(false);
    const userMsg: UiMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: message,
    };
    setMessages((prev) => [...prev, userMsg]);
    setBusy(true);
    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const { result } = await aiEditorResolveAssistantChat(getToken, {
        message,
        history,
        localOnly,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: result.answer,
          result,
        },
      ]);
      setAnswerReady(true);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: e instanceof Error ? e.message : "Something went wrong",
        },
      ]);
      setAnswerReady(true);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  if (!isAiEditorEnabled()) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">AI Editor is disabled.</p>
      </div>
    );
  }

  if (!appUser) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/ai-editor"
          className="inline-flex items-center gap-1 text-sm font-medium text-sky-800 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          AI Editor
        </Link>
        {messages.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={clearChat}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Clear chat / new question
          </Button>
        ) : null}
      </div>

      <PageHeader
        title="Resolve assistant"
        subtitle="Chat about DaVinci Resolve. Answers use your official Reference Manual — with steps and zoomable page images."
      />

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm">
        {statusError ? (
          <p className="text-amber-900">{statusError}</p>
        ) : status?.ready && status.manifest ? (
          <div className="flex flex-wrap items-center gap-2 text-slate-700">
            <BookOpen className="h-4 w-4 text-slate-500" />
            <span>
              Using <span className="font-medium">{status.manifest.sourceName}</span>
              {" · "}
              {status.manifest.pageCount.toLocaleString()} pages indexed
            </span>
          </div>
        ) : status && !status.ready ? (
          <div className="space-y-1 text-amber-950">
            <p className="font-medium">Manual not indexed yet</p>
            <p className="text-amber-900/90">
              Run locally:{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-xs">
                {status.indexHint}
              </code>
            </p>
          </div>
        ) : (
          <p className="text-slate-500">Checking manual index…</p>
        )}
        <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={localOnly}
            onChange={(e) => setLocalOnly(e.target.checked)}
            className="rounded border-slate-300"
          />
          Local only (skip cloud phrasing — still shows manual steps + page images)
        </label>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          {messages.length === 0 ? (
            <div className="space-y-4 py-6">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Ask anything about Resolve</p>
                  <p className="mt-1 text-sm text-slate-600">
                    You’ll get clear steps plus zoomable screenshots from the matching manual pages.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy || !status?.ready}
                    onClick={() => void send(s)}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "w-full max-w-[98%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-auto max-w-[92%] bg-sky-600 text-white sm:max-w-[80%]"
                    : "bg-slate-50 text-slate-800 ring-1 ring-slate-200"
                )}
              >
                {m.role === "assistant" ? (
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <MessageSquare className="h-3 w-3" />
                    Resolve coach
                  </div>
                ) : null}
                <div className="whitespace-pre-wrap">{m.content}</div>

                {m.result?.steps?.length ? (
                  <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">
                      Do this in Resolve
                    </p>
                    <ol className="mt-2 space-y-1.5">
                      {m.result.steps.map((step, i) => (
                        <li key={`${m.id}-s${i}`} className="flex gap-2 text-sm text-slate-800">
                          <span className="font-semibold text-sky-700">{i + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {m.result?.citations?.length ? (
                  <div className="mt-3 space-y-3 border-t border-slate-200/80 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      From your manual — open large to read figures
                    </p>
                    {m.result.citations.map((c) => (
                      <div key={c.chunkId} className="space-y-1.5">
                        <ManualPageImage page={c.page} getToken={getToken} />
                        <p className="px-0.5 text-[11px] leading-snug text-slate-500">
                          {c.excerpt}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {busy ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching the Resolve manual…
            </div>
          ) : null}

          {!busy && answerReady && messages.length > 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-emerald-950">Answer ready</p>
                  <p className="mt-0.5 text-xs text-emerald-900/80">
                    Open a manual page large to zoom in on figures. When you’re finished with this
                    topic, clear the chat or ask another question below.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={clearChat}>
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Done — clear chat
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAnswerReady(false);
                        inputRef.current?.focus();
                      }}
                    >
                      Ask a follow-up
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={onSubmit}
          className="flex gap-2 border-t border-slate-100 bg-slate-50/50 p-3"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            placeholder="Ask how to do something in Resolve…"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-sky-200 placeholder:text-slate-400 focus:ring-2"
          />
          <Button type="submit" disabled={busy || !input.trim()}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
