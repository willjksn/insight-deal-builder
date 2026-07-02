import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import {
  APP_NAME,
  BRAND_ICON_PATH,
  BRAND_LOGO_PATH,
} from "@/lib/brand";

type BrandLogoVariant = "full" | "icon";

const SIZES: Record<BrandLogoVariant, { width: number; height: number }> = {
  full: { width: 220, height: 48 },
  icon: { width: 48, height: 48 },
};

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  priority?: boolean;
}

export function BrandLogo({ variant = "full", className, priority = false }: BrandLogoProps) {
  const src = variant === "icon" ? BRAND_ICON_PATH : BRAND_LOGO_PATH;
  const { width, height } = SIZES[variant];

  return (
    <Image
      src={src}
      alt={APP_NAME}
      width={width}
      height={height}
      priority={priority}
      className={cn("h-auto w-auto object-contain", className)}
    />
  );
}
