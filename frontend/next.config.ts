import type { NextConfig } from "next";

const BACKEND_BASE =
  process.env.NEXT_PUBLIC_BACKEND_BASE ?? "http://localhost:9001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_BASE}/api/:path*`,
      },
      {
        source: "/static/:path*",
        destination: `${BACKEND_BASE}/static/:path*`,
      },
    ];
  },
};

export default nextConfig;