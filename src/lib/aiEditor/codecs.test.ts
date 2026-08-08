import { describe, expect, it } from "vitest";
import { classifyCodec } from "@/lib/aiEditor/codecs";

describe("classifyCodec", () => {
  it("flags XAVC HS / XAVS HS for proxy", () => {
    const a = classifyCodec({ codec: "hevc", codecLongName: "Sony XAVC HS", filename: "A001.MP4" });
    expect(a.family).toBe("xavc_hs");
    expect(a.needsProxy).toBe(true);

    const b = classifyCodec({ codec: "hevc", codecTag: "xavs", filename: "clip.mp4" });
    expect(b.needsProxy).toBe(true);
  });

  it("flags XAVC S and S-I", () => {
    const s = classifyCodec({
      codec: "h264",
      codecLongName: "XAVC S",
      container: "mov,mp4",
    });
    expect(s.family).toBe("xavc_s");
    expect(s.needsProxy).toBe(true);

    const si = classifyCodec({
      codec: "h264",
      codecLongName: "XAVC S-I",
      filename: "A001C001.MXF",
    });
    expect(si.family).toBe("xavc_s_i");
    expect(si.needsProxy).toBe(true);
  });

  it("does not force proxy for plain H.264", () => {
    const c = classifyCodec({ codec: "h264", filename: "screen.mp4" });
    expect(c.family).toBe("h264");
    expect(c.needsProxy).toBe(false);
  });
});
