/** @type {import('next').NextConfig} */
const isVercel = process.env.VERCEL === '1'

const nextConfig = {
  // Use custom build dir locally to avoid OneDrive locks; keep default on Vercel
  ...(isVercel ? {} : { distDir: '.next-build' }),
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
