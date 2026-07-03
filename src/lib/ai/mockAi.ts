/** True when AI routes should use mock responses instead of live Gemini. */
export function aiUsesMock(): boolean {
  return process.env.SCOUT_USE_MOCK_AI === "true";
}

/** @deprecated */
export const scoutAiUsesMock = aiUsesMock;
