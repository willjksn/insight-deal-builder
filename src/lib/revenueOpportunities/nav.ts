import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Inbox,
  LayoutDashboard,
  Mail,
  Phone,
  Settings,
  Target,
  Users,
  Workflow,
  FileText,
  Megaphone,
} from "lucide-react";

export type RevenueNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

export const REVENUE_NAV_ITEMS: RevenueNavItem[] = [
  {
    href: "/revenue",
    label: "Command Center",
    icon: LayoutDashboard,
    description: "Daily priorities, pipeline snapshot, and recommended actions",
  },
  {
    href: "/revenue/campaigns",
    label: "Campaigns",
    icon: Megaphone,
    description: "IMG client and Stormi brand prospecting campaigns",
  },
  {
    href: "/revenue/opportunities",
    label: "Opportunities",
    icon: Target,
    description: "Researched businesses and brands awaiting review",
  },
  {
    href: "/revenue/outreach",
    label: "Outreach",
    icon: Mail,
    description: "Prepared emails, DMs, and follow-ups",
  },
  {
    href: "/revenue/inbox",
    label: "Inbox",
    icon: Inbox,
    description: "Gmail threads and reply classification",
  },
  {
    href: "/revenue/pipeline",
    label: "Pipeline",
    icon: Briefcase,
    description: "Kanban board — drag opportunities between stages",
  },
  {
    href: "/revenue/discovery",
    label: "Discovery",
    icon: Phone,
    description: "Call prep and post-call notes",
  },
  {
    href: "/revenue/proposals",
    label: "Proposals",
    icon: FileText,
    description: "Draft proposals linked to agreements",
  },
  {
    href: "/revenue/automations",
    label: "Automations",
    icon: Workflow,
    description: "Agent registry, n8n workflow runs, and failure retries",
  },
  {
    href: "/revenue/analytics",
    label: "Analytics",
    icon: BarChart3,
    description: "Approval rate, reply rate, pipeline value, and AI spend",
  },
  {
    href: "/revenue/settings",
    label: "Settings",
    icon: Settings,
    description: "Gmail and n8n integration status",
  },
  {
    href: "/revenue/guide",
    label: "How to use",
    icon: BookOpen,
    description: "Step-by-step guide for campaigns through conversion",
  },
];

/** Secondary link shown on command center for team context */
export const REVENUE_TEAM_HINT = {
  label: "Insight Media Group & Stormi",
  icon: Users,
};
