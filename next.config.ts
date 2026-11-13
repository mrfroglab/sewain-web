import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prototype is client-rendered (state lives in the browser), so we keep the classic caching model.
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
