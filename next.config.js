/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ⚠️ Warning: This ignores all TypeScript errors during build
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  }
};

module.exports = nextConfig;
