import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The demo seed, sample buttons and link-preview image read these files from disk; make sure they ship with these routes
  outputFileTracingIncludes: {
    "/api/demo/*": ["./sample-data/pdfs/ratecon-01-dry-van.pdf"],
    "/samples/*": ["./sample-data/emails/*.txt", "./sample-data/pdfs/*.pdf"],
    "/opengraph-image": ["./assets/*.ttf"],
    "/case-study/opengraph-image": ["./assets/*.ttf"],
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
