/** @type {import('next').NextConfig} */
const nextConfig = {
  // Move Next build output away from default .next to avoid OneDrive file locks on Windows
  distDir: '.next-build',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
