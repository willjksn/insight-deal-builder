"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";

const IMG_SITE = "https://insightmediagroupllc.com/";
const IMG_ICON = "/brand/img-logo-icon.png";

const emptyForm = {
  professionalName: "",
  email: "",
  phone: "",
  location: "",
  primaryNiche: "",
  portfolioUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
  website: "",
  audienceDescription: "",
  whyJoin: "",
  referralSource: "",
  companyWebsite: "",
  acceptedLegal: false,
};

const NICHE_OPTIONS = [
  { value: "", label: "Select niche…" },
  { value: "Beauty", label: "Beauty" },
  { value: "Fashion", label: "Fashion" },
  { value: "Lifestyle", label: "Lifestyle" },
  { value: "Fitness", label: "Fitness / wellness" },
  { value: "Travel", label: "Travel" },
  { value: "Food", label: "Food / hospitality" },
  { value: "UGC", label: "UGC / product content" },
  { value: "Other", label: "Other" },
];

const fieldClass =
  "w-full rounded-lg border border-slate-700/80 bg-slate-950/50 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-[#0ea5e9]/50 focus:ring-2 focus:ring-[#0ea5e9]/20";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-400";

function ImgLogo({ size = "nav" }: { size?: "nav" | "footer" }) {
  const icon = size === "footer" ? "h-12 w-12" : "h-10 w-10 md:h-11 md:w-11";
  const insight = size === "footer" ? "text-xl" : "text-base md:text-lg";
  return (
    <span className="flex items-center gap-2.5 md:gap-3">
      <Image
        src={IMG_ICON}
        alt=""
        width={48}
        height={48}
        priority={size === "nav"}
        className={`${icon} shrink-0 object-contain`}
        aria-hidden
      />
      <span className="flex flex-col justify-center gap-0 leading-[0.95]">
        <span
          className={`${insight} font-bold tracking-[0.08em] text-transparent bg-clip-text bg-gradient-to-b from-[#7dd3fc] to-[#0284c7]`}
        >
          INSIGHT
        </span>
        <span className="text-[11px] md:text-xs -mt-0.5 font-semibold uppercase tracking-[0.18em] text-[#38bdf8]/95">
          Media Group
        </span>
      </span>
    </span>
  );
}

export default function PublicCreatorApplyPage() {
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const set = (key: keyof typeof emptyForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.acceptedLegal) {
      setError("Please accept the Application Terms and Privacy Notice to continue.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/public/creator-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          acceptedLegal: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to submit application");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit application");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-300">
      {/* Hero ambient blurs */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-[480px] w-[480px] rounded-full bg-[#0284c7]/15 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[120px]"
      />

      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm transition-colors duration-300">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex h-16 items-center justify-between md:h-20">
            <a href={IMG_SITE} aria-label="Insight Media Group home">
              <ImgLogo />
            </a>
            <a
              href={IMG_SITE}
              className="inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-950/50 px-3 py-1.5 text-sm font-medium text-slate-200 transition-all duration-200 hover:border-[#0ea5e9]/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-950 md:px-4 md:py-2"
            >
              IMG site
            </a>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-16 md:pt-20">
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-28">
          {submitted ? (
            <div className="mx-auto max-w-xl rounded-xl border border-slate-800 bg-slate-950 px-6 py-12 text-center md:px-10">
              <div className="mb-6 flex justify-center">
                <ImgLogo />
              </div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#38bdf8]/90">
                Application received
              </p>
              <h1
                className="text-3xl leading-tight tracking-tight text-white md:text-4xl"
                style={{ fontFamily: "var(--font-img-serif), Georgia, serif" }}
              >
                We&apos;ll be in touch.
              </h1>
              <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-slate-400">
                Our team will review your work. If we move forward, we&apos;ll reach out about an
                interview. A ShootSpine account is only needed later if you join the network.
              </p>
              <a
                href={IMG_SITE}
                className="mt-8 inline-flex items-center justify-center rounded-lg bg-[#0284c7] px-6 py-3 text-base font-medium text-white shadow-lg shadow-[#082f49]/30 transition-all duration-200 hover:bg-[#0ea5e9] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                Back to IMG
              </a>
            </div>
          ) : (
            <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#38bdf8]/90">
                  Creator network · Charlotte, NC
                </p>
                <h1
                  className="mt-4 font-serif text-3xl leading-tight tracking-tight text-white md:text-4xl lg:text-[2.75rem]"
                  style={{ fontFamily: "var(--font-img-serif), Georgia, serif" }}
                >
                  Apply to create with{" "}
                  <span className="bg-gradient-to-r from-[#7dd3fc] to-purple-300 bg-clip-text text-transparent">
                    Insight Media Group
                  </span>
                </h1>
                <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-400">
                  We shoot brands, film campaigns, and work with creators who care how something
                  feels on camera — not just how it reads in a deck.
                </p>

                <ol className="mt-10 space-y-5 border-t border-slate-800/60 pt-8">
                  {[
                    { n: "01", t: "Apply", d: "Share your niche, links, and why you want in." },
                    {
                      n: "02",
                      t: "Review & interview",
                      d: "Our team looks at fit, then may invite a call.",
                    },
                    {
                      n: "03",
                      t: "Join the network",
                      d: "If approved, we invite you to create a ShootSpine account.",
                    },
                  ].map((step) => (
                    <li key={step.n} className="flex gap-4">
                      <span
                        className="text-sm tabular-nums text-[#38bdf8]/90"
                        style={{ fontFamily: "var(--font-img-serif), Georgia, serif" }}
                      >
                        {step.n}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{step.t}</p>
                        <p className="text-sm text-slate-500">{step.d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <form
                onSubmit={handleSubmit}
                className="relative space-y-5 rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-xl shadow-black/30 ring-1 ring-white/5 md:p-8"
              >
                <div className="absolute -left-[9999px] opacity-0" aria-hidden="true">
                  <label>
                    Company website
                    <input
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.companyWebsite}
                      onChange={(e) => set("companyWebsite", e.target.value)}
                    />
                  </label>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#38bdf8]/90">
                    Your application
                  </p>
                  <p className="mt-1 text-sm text-slate-500">No account needed to apply.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Creator / professional name *</span>
                    <input
                      className={fieldClass}
                      value={form.professionalName}
                      onChange={(e) => set("professionalName", e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Email *</span>
                    <input
                      type="email"
                      className={fieldClass}
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Phone</span>
                    <input
                      className={fieldClass}
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      autoComplete="tel"
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Location</span>
                    <input
                      className={fieldClass}
                      value={form.location}
                      onChange={(e) => set("location", e.target.value)}
                      placeholder="City / region"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className={labelClass}>Primary niche</span>
                  <select
                    className={`${fieldClass} appearance-none`}
                    value={form.primaryNiche}
                    onChange={(e) => set("primaryNiche", e.target.value)}
                  >
                    {NICHE_OPTIONS.map((o) => (
                      <option key={o.value || "empty"} value={o.value} className="bg-slate-900">
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Instagram</span>
                    <input
                      className={fieldClass}
                      value={form.instagramUrl}
                      onChange={(e) => set("instagramUrl", e.target.value)}
                      placeholder="https://instagram.com/…"
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>TikTok</span>
                    <input
                      className={fieldClass}
                      value={form.tiktokUrl}
                      onChange={(e) => set("tiktokUrl", e.target.value)}
                      placeholder="https://tiktok.com/@…"
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>YouTube</span>
                    <input
                      className={fieldClass}
                      value={form.youtubeUrl}
                      onChange={(e) => set("youtubeUrl", e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Portfolio / site</span>
                    <input
                      className={fieldClass}
                      value={form.portfolioUrl || form.website}
                      onChange={(e) => {
                        set("portfolioUrl", e.target.value);
                        set("website", e.target.value);
                      }}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className={labelClass}>Audience & content style</span>
                  <textarea
                    className={`${fieldClass} min-h-[88px] resize-y`}
                    value={form.audienceDescription}
                    onChange={(e) => set("audienceDescription", e.target.value)}
                    rows={3}
                    placeholder="Who follows you, and what kind of content do you make?"
                  />
                </label>

                <label className="block">
                  <span className={labelClass}>Why Insight Media Group? *</span>
                  <textarea
                    className={`${fieldClass} min-h-[110px] resize-y`}
                    value={form.whyJoin}
                    onChange={(e) => set("whyJoin", e.target.value)}
                    rows={4}
                    required
                    placeholder="What do you want to make with us?"
                  />
                </label>

                <label className="block">
                  <span className={labelClass}>How did you hear about us?</span>
                  <input
                    className={fieldClass}
                    value={form.referralSource}
                    onChange={(e) => set("referralSource", e.target.value)}
                    placeholder="IMG site, Instagram, referral…"
                  />
                </label>

                <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3.5">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 text-[#0284c7] focus:ring-[#0ea5e9] focus:ring-offset-slate-950"
                    checked={form.acceptedLegal}
                    onChange={(e) => set("acceptedLegal", e.target.checked)}
                    required
                  />
                  <span className="text-sm leading-relaxed text-slate-400">
                    I have read and agree to the{" "}
                    <Link
                      href="/apply/creators/terms"
                      target="_blank"
                      className="font-medium text-[#7dd3fc] underline-offset-2 hover:text-white hover:underline"
                    >
                      Application Terms
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/apply/creators/privacy"
                      target="_blank"
                      className="font-medium text-[#7dd3fc] underline-offset-2 hover:text-white hover:underline"
                    >
                      Privacy Notice
                    </Link>
                    . I understand applying does not guarantee acceptance or work, and a ShootSpine
                    account is only created if IMG invites me later.
                  </span>
                </label>

                {error && (
                  <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy || !form.acceptedLegal}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-[#0284c7] px-6 py-3 text-base font-medium text-white shadow-lg shadow-[#082f49]/30 transition-all duration-200 hover:bg-[#0ea5e9] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {busy ? "Submitting…" : "Submit application"}
                </button>
              </form>
            </div>
          )}
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-800/60">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 py-10 sm:px-8 md:flex-row md:items-center">
          <a href={IMG_SITE} aria-label="Insight Media Group home">
            <ImgLogo size="footer" />
          </a>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            <Link href="/apply/creators/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/apply/creators/privacy" className="hover:text-white">
              Privacy
            </Link>
            <span>© {new Date().getFullYear()} {PRODUCER_LEGAL_NAME} · Charlotte, NC</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
