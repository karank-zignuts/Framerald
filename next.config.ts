import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // e2e runs its own servers beside `npm run dev`; a separate build folder per server avoids Next's dev lock.
  distDir: process.env.NEXT_DIST_DIR ?? (process.env.E2E_MOCK_AI === "1" ? ".next-e2e" : ".next"),
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [{ source: "/", destination: "/image", permanent: false }];
  },
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
