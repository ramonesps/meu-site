import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/nyc", destination: "/nyc.html" },
    ];
  },
};

export default nextConfig;
