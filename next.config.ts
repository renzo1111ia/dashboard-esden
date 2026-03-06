import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/dashboardadmin/:path*',
        destination: '/dashboard/:path*',
      },
    ];
  },
};

export default nextConfig;
