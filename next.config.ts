import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The demo seed reads this PDF from disk; make sure it ships with these routes
  outputFileTracingIncludes: {
    "/api/demo/*": ["./sample-data/pdfs/ratecon-01-dry-van.pdf"],
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
