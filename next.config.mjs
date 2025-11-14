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
  },
  // Excluir pasta UI do build
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/UI/**', '**/node_modules/**']
    };
    return config;
  }
};

export default nextConfig;

