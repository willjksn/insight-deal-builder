import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
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
