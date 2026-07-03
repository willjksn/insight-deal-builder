/** Resolve shot list + storyboard flags for API routes and client. */
export function resolveScriptGenerationOptions(
  body: { detailedShotList?: boolean; storyboardMode?: boolean },
  session?: { detailedShotList?: boolean; storyboardMode?: boolean }
): { detailedShotList: boolean; storyboardMode: boolean } {
  const storyboardMode = body.storyboardMode ?? session?.storyboardMode ?? false;
  const detailedShotList = body.detailedShotList ?? session?.detailedShotList !== false;
  return { detailedShotList, storyboardMode };
}
