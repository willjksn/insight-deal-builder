export function formatMarketArea(input: {
  city?: string;
  zip?: string;
  state?: string;
}): string {
  const city = input.city?.trim();
  const state = input.state?.trim().toUpperCase();
  const zip = input.zip?.trim();
  const parts: string[] = [];
  if (city && state) parts.push(`${city}, ${state}`);
  else if (city) parts.push(city);
  else if (state) parts.push(state);
  if (zip) {
    if (parts.length) return `${parts.join("")} (${zip})`.replace(/,\s*\(/, " (");
    return `ZIP ${zip}`;
  }
  return parts.join("") || "United States (national benchmarks)";
}
