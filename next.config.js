// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
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
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.salla.sa",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "salla-dev.s3.eu-central-1.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "salla.sa",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "s.salla.sa",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};


module.exports = nextConfig;
