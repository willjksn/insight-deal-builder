import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Do not externalize firebase-admin — Vercel serverless require() hits ESM errors in jose/jwks-rsa.
};

export default nextConfig;
