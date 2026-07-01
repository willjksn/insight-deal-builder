import { LucideIcon } from "lucide-react";
import { AppUser } from "@/lib/types";

export type GuideLink = {
  label: string;
  href: string;
};

export type GuideBlock = {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  tips?: string[];
  links?: GuideLink[];
};

export type GuideSection = {
  id: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  /** Return true when this section applies to the signed-in user. */
  canAccess: (user: AppUser | null) => boolean;
  blocks: GuideBlock[];
};

export type GuideCategory = {
  id: string;
  label: string;
  canAccess: (user: AppUser | null) => boolean;
  sections: GuideSection[];
};
