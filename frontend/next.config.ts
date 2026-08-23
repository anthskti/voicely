import type { NextConfig } from "next";

const goBackend = (
  process.env.GO_BACKEND_URL ||
  process.env.NEXT_PUBLIC_GO_BACKEND_URL ||
  "http://localhost:8080"
);

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${goBackend}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
