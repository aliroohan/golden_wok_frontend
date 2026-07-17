/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  // next-pwa uses webpack internally; tell Turbopack it's fine
  turbopack: {},
};

// Apply next-pwa in production only
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
  });
  module.exports = withPWA(nextConfig);
} else {
  module.exports = nextConfig;
}
