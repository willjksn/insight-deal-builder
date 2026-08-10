import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
  // Resolve assistant index downloaded at build into data/resolve-manual/
  outputFileTracingIncludes: {
    "/api/ai-editor/resolve-assistant": ["./data/resolve-manual/**/*"],
    "/api/ai-editor/resolve-assistant/page": ["./data/resolve-manual/**/*"],
  },
  async redirects() {
    return [
      { source: "/scout", destination: "/dashboard", permanent: false },
      { source: "/scout/:path*", destination: "/dashboard", permanent: false },
      { source: "/settings/scout-gear", destination: "/settings", permanent: false },
      { source: "/settings/lights", destination: "/settings", permanent: false },
    ];
  },
};

export default nextConfig;
