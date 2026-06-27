import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "firebase-admin",
    "@google-cloud/firestore",
    "@google-cloud/storage",
    "google-gax",
  ],
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./node_modules/firebase-admin/**",
      "./node_modules/@google-cloud/**",
      "./node_modules/google-gax/**",
      "./node_modules/@grpc/**",
      "./node_modules/@opentelemetry/api/**",
    ],
  },
};

export default nextConfig;
