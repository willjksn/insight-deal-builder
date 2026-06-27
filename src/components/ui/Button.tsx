import { cn } from "@/lib/utils/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "touch";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shadow-sm",
          {
            "bg-gradient-to-b from-sky-400 to-sky-500 text-white hover:from-sky-500 hover:to-sky-600 focus:ring-sky-400 shadow-sky-500/20":
              variant === "primary",
            "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-400":
              variant === "secondary",
            "border border-slate-200 bg-white/80 text-slate-700 hover:bg-white hover:border-sky-200 hover:text-sky-900 focus:ring-sky-400 backdrop-blur-sm":
              variant === "outline",
            "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 focus:ring-slate-400 shadow-none":
              variant === "ghost",
            "bg-gradient-to-b from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:ring-red-500 shadow-red-500/20":
              variant === "danger",
            "px-3 py-1.5 text-sm": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-6 py-3 text-base": size === "lg",
            "px-6 py-4 text-base min-h-[52px] min-w-[120px]": size === "touch",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
