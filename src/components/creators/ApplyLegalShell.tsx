import Image from "next/image";
import Link from "next/link";
import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";
import {
  CREATOR_APPLY_LEGAL_UPDATED,
  CREATOR_APPLY_LEGAL_VERSION,
  type ApplyLegalDocument,
} from "@/lib/creators/applyLegalContent";

const IMG_SITE = "https://insightmediagroupllc.com/";
const IMG_ICON = "/brand/img-logo-icon.png";

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
        className={`${icon} shrink-0 object-contain`}
        aria-hidden
      />
      <span className="flex flex-col justify-center gap-0 leading-[0.95]">
        <span
          className={`${insight} bg-gradient-to-b from-[#7dd3fc] to-[#0284c7] bg-clip-text font-bold tracking-[0.08em] text-transparent`}
        >
          INSIGHT
        </span>
        <span className="-mt-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#38bdf8]/95 md:text-xs">
          Media Group
        </span>
      </span>
    </span>
  );
}

export function ApplyLegalShell({
  document,
  otherHref,
  otherLabel,
}: {
  document: ApplyLegalDocument;
  otherHref: string;
  otherLabel: string;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-300">
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-[320px] w-[320px] rounded-full bg-[#0284c7]/15 blur-[120px]"
      />

      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex h-16 items-center justify-between md:h-20">
            <Link href="/apply/creators" aria-label="Back to creator application">
              <ImgLogo />
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <Link href="/apply/creators" className="text-slate-400 transition-colors hover:text-white">
                Apply
              </Link>
              <Link href={otherHref} className="text-slate-400 transition-colors hover:text-white">
                {otherLabel}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-16 md:pt-20">
        <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#38bdf8]/90">
            Legal · Creator network
          </p>
          <h1
            className="mt-3 text-3xl leading-tight tracking-tight text-white md:text-4xl"
            style={{ fontFamily: "var(--font-img-serif), Georgia, serif" }}
          >
            {document.title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-400">{document.subtitle}</p>
          <p className="mt-2 text-sm text-slate-500">
            Last updated {CREATOR_APPLY_LEGAL_UPDATED} · Version {CREATOR_APPLY_LEGAL_VERSION}
          </p>

          <div className="mt-12 space-y-10 border-t border-slate-800/60 pt-10">
            {document.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-base font-semibold text-white">{section.title}</h2>
                {section.paragraphs?.map((p) => (
                  <p key={p.slice(0, 64)} className="mt-3 text-sm leading-relaxed text-slate-400">
                    {p}
                  </p>
                ))}
                {section.bullets?.length ? (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-400">
                    {section.bullets.map((b) => (
                      <li key={b.slice(0, 64)}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap gap-4 border-t border-slate-800/60 pt-8 text-sm">
            <Link href="/apply/creators" className="text-[#7dd3fc] hover:text-white hover:underline">
              ← Back to application
            </Link>
            <Link href={otherHref} className="text-slate-400 hover:text-white hover:underline">
              {otherLabel}
            </Link>
            <a
              href={IMG_SITE}
              className="text-slate-400 hover:text-white hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              insightmediagroupllc.com
            </a>
          </div>
        </article>
      </main>

      <footer className="relative z-10 border-t border-slate-800/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <Link href="/apply/creators">
            <ImgLogo size="footer" />
          </Link>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} {PRODUCER_LEGAL_NAME} · Charlotte, NC
          </p>
        </div>
      </footer>
    </div>
  );
}
