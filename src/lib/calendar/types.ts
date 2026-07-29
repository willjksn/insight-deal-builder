export type CalendarEventKind =
  | "shoot"
  | "production_day"
  | "delivery"
  | "payment"
  | "rental"
  | "campaign";

export type CalendarEvent = {
  id: string;
  kind: CalendarEventKind;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  subtitle?: string;
  href: string;
  projectId?: string;
  agreementId?: string;
  campaignId?: string;
};

export type CalendarFilter = "all" | "shoot" | "delivery" | "payment" | "campaign";

export const CALENDAR_KIND_LABELS: Record<CalendarEventKind, string> = {
  shoot: "Shoot",
  production_day: "Production day",
  delivery: "Delivery",
  payment: "Payment",
  rental: "Rental",
  campaign: "Campaign",
};

export const CALENDAR_KIND_COLORS: Record<CalendarEventKind, string> = {
  shoot: "bg-sky-500",
  production_day: "bg-violet-500",
  delivery: "bg-emerald-500",
  payment: "bg-amber-500",
  rental: "bg-orange-500",
  campaign: "bg-fuchsia-500",
};
