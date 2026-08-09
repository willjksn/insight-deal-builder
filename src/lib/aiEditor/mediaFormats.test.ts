import { describe, expect, it } from "vitest";
import {
  isIngestableMediaExtension,
  isRoughCutVideoAsset,
  kindForExtension,
} from "@/lib/aiEditor/mediaFormats";

describe("mediaFormats", () => {
  it("ingests video and audio only", () => {
    expect(isIngestableMediaExtension("C0042.MP4")).toBe(true);
    expect(isIngestableMediaExtension("clip.mov")).toBe(true);
    expect(isIngestableMediaExtension("ZOOM0001.WAV")).toBe(true);
    expect(isIngestableMediaExtension("C0042T01.JPG")).toBe(false);
    expect(isIngestableMediaExtension("ref.png")).toBe(false);
  });

  it("still classifies images for detectors", () => {
    expect(kindForExtension("C0042T01.JPG")).toBe("image");
    expect(kindForExtension("C0042.MP4")).toBe("video");
  });

  it("keeps MJPEG-mislabeled JPGs out of the rough cut", () => {
    expect(
      isRoughCutVideoAsset({ filename: "C0042T01.JPG", mediaType: "video" })
    ).toBe(false);
    expect(
      isRoughCutVideoAsset({ filename: "C0042.MP4", mediaType: "video" })
    ).toBe(true);
  });
});
