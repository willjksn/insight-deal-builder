import { describe, expect, it } from "vitest";
import { tavilyBudgetExhausted } from "@/lib/search/tavilyBudget";

describe("tavilyBudgetExhausted", () => {
  it("is not exhausted well under the cap", () => {
    expect(tavilyBudgetExhausted(100, 1000, 20)).toBe(false);
  });

  it("trips once within the reserve margin of the cap", () => {
    expect(tavilyBudgetExhausted(980, 1000, 20)).toBe(true);
    expect(tavilyBudgetExhausted(979, 1000, 20)).toBe(false);
  });

  it("trips at or over the cap", () => {
    expect(tavilyBudgetExhausted(1000, 1000, 20)).toBe(true);
    expect(tavilyBudgetExhausted(1200, 1000, 20)).toBe(true);
  });

  it("is disabled when the cap is zero or negative", () => {
    expect(tavilyBudgetExhausted(5000, 0, 20)).toBe(false);
    expect(tavilyBudgetExhausted(5000, -1, 20)).toBe(false);
  });

  it("supports a zero reserve (stop exactly at the cap)", () => {
    expect(tavilyBudgetExhausted(999, 1000, 0)).toBe(false);
    expect(tavilyBudgetExhausted(1000, 1000, 0)).toBe(true);
  });
});
