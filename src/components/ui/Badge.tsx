import { cn } from "@/lib/utils/cn";

const variants = {
  default: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/60",
  success: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  warning: "bg-sky-50 text-sky-900 ring-1 ring-sky-200",
  danger: "bg-red-50 text-red-800 ring-1 ring-red-200",
  info: "bg-sky-50 text-sky-800 ring-1 ring-sky-200",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
