import { format, parseISO, isValid } from "date-fns";

export function formatDate(date: string | Date | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return String(date);
  return format(d, "MMM d, yyyy");
}

export function formatDateTime(date: string | Date | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return String(date);
  return format(d, "MMM d, yyyy h:mm a");
}
