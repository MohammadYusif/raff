// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.salla.sa',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
        pathname: '/**',
      },
    ],
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
   images: {
    remotePatterns: [
      { protocol: "https", hostname: "salla-dev.s3.eu-central-1.amazonaws.com" },
      { protocol: "https", hostname: "salla.sa" },
      { protocol: "https", hostname: "s.salla.sa" },
    ],
  },
};


module.exports = nextConfig;

