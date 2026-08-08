/** Managed project folder layout under ProjectRoot. */
export const MANAGED_PROJECT_ROOT_FOLDERS = [
  "01_ORIGINAL_MEDIA",
  "02_PROXIES",
  "03_PROJECT_FILES",
  "04_AUDIO",
  "05_GRAPHICS",
  "06_EXPORTS",
  "07_CACHE",
  "08_REFERENCE",
] as const;

export const ORIGINAL_MEDIA_SUBFOLDERS_DEFAULT = [
  "CAMERA_A",
  "AUDIO",
  "DRONE",
  "OTHER",
] as const;

export function buildManagedFolderPlan(cameraLabels: string[] = ["CAMERA_A"]): string[] {
  const cameras = (cameraLabels.length ? cameraLabels : ["CAMERA_A"]).map((c) =>
    c.replace(/[^\w\-]+/g, "_").toUpperCase()
  );
  const unique = [...new Set(cameras)];
  return [
    ...MANAGED_PROJECT_ROOT_FOLDERS,
    ...unique.map((c) => `01_ORIGINAL_MEDIA/${c}`),
    "01_ORIGINAL_MEDIA/AUDIO",
    "01_ORIGINAL_MEDIA/DRONE",
    "01_ORIGINAL_MEDIA/OTHER",
  ];
}
