/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/Phomemo-Web-BLE', // Change this to your repository name
  assetPrefix: '/Phomemo-Web-BLE/', // Change this to your repository name
};

module.exports = nextConfig;
