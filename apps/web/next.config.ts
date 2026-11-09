import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@edgi/contracts', '@edgi/config'],
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
