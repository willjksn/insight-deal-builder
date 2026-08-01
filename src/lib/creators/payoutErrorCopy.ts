/** Friendlier creator-facing copy for known payoutError strings. */
export function formatCreatorPayoutErrorForPortal(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const t = raw.trim();
  if (
    t === "Paid record cleared by staff" ||
    t.startsWith("Staff cleared the paid record")
  ) {
    return "Staff cleared the paid record for this campaign. It shows as unpaid again until payment is re-recorded.";
  }
  if (t.startsWith("Stripe transfer was reversed")) {
    return "Your Stripe payment for this campaign was reversed. It shows as unpaid again — staff can re-pay when ready.";
  }
  if (t.startsWith("Stripe transfer partially reversed")) {
    return "Part of your Stripe payment was reversed. Staff are reviewing it — check with the team if you have questions.";
  }
  return t;
}
