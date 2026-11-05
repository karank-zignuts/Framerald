import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // e2e runs its own server beside `npm run dev`; a separate build folder avoids Next's dev lock.
  distDir: process.env.E2E_MOCK_AI === "1" ? ".next-e2e" : ".next",
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
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
