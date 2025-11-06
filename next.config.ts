// next.config.ts
import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';
const repoName = 'next-calculator'; 

const nextConfig: NextConfig = {
  output: 'export',                 // static export
  basePath: isProd ? `/${repoName}` : undefined,
  assetPrefix: isProd ? `/${repoName}/` : undefined,
  images: { unoptimized: true },    // safe if you use next/image
  trailingSlash: true,              // helps with GitHub Pages routing
};

export default nextConfig;
