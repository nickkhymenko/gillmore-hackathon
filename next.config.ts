import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // The old standalone pages now live inside the walk and the dashboard.
  async redirects() {
    return [
      { source: "/checkin", destination: "/walk#check-in", permanent: false },
      { source: "/pet", destination: "/dashboard", permanent: false },
      // The video scan lives on the dashboard (docs/13).
      { source: "/scan", destination: "/dashboard#video", permanent: false },
    ];
  },
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
