import JSZip from "jszip";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return IMAGE_EXT.test(file.name);
}

function mimeFromFilename(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

export function isZipFile(file: File): boolean {
  const type = file.type.toLowerCase();
  return (
    type === "application/zip" ||
    type === "application/x-zip-compressed" ||
    file.name.toLowerCase().endsWith(".zip")
  );
}

/** Extract image files from a ZIP (e.g. ShotDeck export). Skips folders and macOS metadata. */
export async function imageFilesFromZip(zipFile: File): Promise<File[]> {
  const zip = await JSZip.loadAsync(zipFile);
  const entries: { path: string; file: File }[] = [];

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (path.startsWith("__MACOSX/") || path.includes("/.")) continue;

    const baseName = path.split("/").pop() ?? path;
    if (!IMAGE_EXT.test(baseName)) continue;

    const blob = await entry.async("blob");
    entries.push({
      path,
      file: new File([blob], baseName, { type: mimeFromFilename(baseName) }),
    });
  }

  entries.sort((a, b) =>
    a.path.localeCompare(b.path, undefined, { sensitivity: "base", numeric: true })
  );

  return entries.map((e) => e.file);
}
