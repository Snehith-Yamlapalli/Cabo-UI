import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Forces Next.js to compile to static assets
  images: {
    unoptimized: true, // Native mobile webviews do not support the default Next.js image optimization server
  },
};

export default nextConfig;