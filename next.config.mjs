/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb"
    }
  },
  eslint: {
    dirs: ["src"]
  },
  typescript: {
    ignoreBuildErrors: false
  }
};

export default nextConfig;

