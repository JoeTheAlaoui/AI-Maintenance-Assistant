import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment (Coolify/Dokploy)
  output: 'standalone',

  // Required for canvas/sharp packages used by OCR
  experimental: {
    serverComponentsExternalPackages: ['canvas', 'sharp', 'tesseract.js', 'pdf-to-img', 'pdfjs-dist'],
  },

  // External packages that shouldn't be bundled
  serverExternalPackages: ['pdf-parse', 'pdf-to-img', 'pdfjs-dist'],

  // Webpack configuration for pdfjs-dist
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'pdfjs-dist': 'commonjs pdfjs-dist',
        'pdf-to-img': 'commonjs pdf-to-img',
      });
    }
    return config;
  },
};

export default nextConfig;
