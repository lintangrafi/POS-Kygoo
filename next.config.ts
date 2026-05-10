import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Optimized output for Vercel serverless deployment
  output: 'standalone',

  // Enable response compression
  compress: true,

  // Server actions configuration
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Reduce serverless function size by excluding unnecessary packages
  serverExternalPackages: ['postgres'],

  // Performance headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      {
        // Cache static assets aggressively
        source: '/(.*)\\.(ico|png|jpg|jpeg|gif|svg|webp|avif|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
