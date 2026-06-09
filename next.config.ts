import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/nyc", destination: "/nyc.html" },
      { source: "/treino", destination: "/treino.html" },
    ];
  },
};

export default nextConfig;
