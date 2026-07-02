import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type LegalPage = "terms" | "privacy";

const links: { id: LegalPage; href: string; label: string; fullLabel: string }[] = [
  { id: "terms", href: "/terms", label: "Terms", fullLabel: "Terms of Service" },
  { id: "privacy", href: "/privacy", label: "Privacy", fullLabel: "Privacy Policy" },
];

export function LegalFooterLinks({
  className,
  linkClassName,
  exclude,
  variant = "short",
}: {
  className?: string;
  linkClassName?: string;
  exclude?: LegalPage;
  variant?: "short" | "full";
}) {
  const visible = links.filter((link) => link.id !== exclude);

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      {visible.map((link, index) => (
        <span key={link.id} className="inline-flex items-center gap-3">
          {index > 0 ? <span className="text-slate-600/50" aria-hidden="true">·</span> : null}
          <Link href={link.href} className={cn("transition-colors", linkClassName)}>
            {variant === "full" ? link.fullLabel : link.label}
          </Link>
        </span>
      ))}
    </span>
  );
}

export function LegalAcceptanceNotice({
  action,
  className,
  linkClassName,
}: {
  action: "signIn" | "signUp";
  className?: string;
  linkClassName?: string;
}) {
  const verb = action === "signUp" ? "requesting access" : "signing in";

  return (
    <p className={cn("text-xs leading-relaxed text-slate-500", className)}>
      By {verb}, you agree to our{" "}
      <Link href="/terms" className={cn("font-medium underline underline-offset-2", linkClassName)}>
        Terms of Service
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className={cn("font-medium underline underline-offset-2", linkClassName)}>
        Privacy Policy
      </Link>
      .
    </p>
  );
}
