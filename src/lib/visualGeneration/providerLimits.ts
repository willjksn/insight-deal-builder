export const providerLimits = {
  runway: {
    stillPromptMaxCharacters: 1000,
    motionPromptMaxCharacters: 1000,
  },
} as const;

export type VisualProviderId = keyof typeof providerLimits;
