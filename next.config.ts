import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    nodeMiddleware: true,
  },
  // Add redirects for the dashboard route
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/dashboard/home',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;