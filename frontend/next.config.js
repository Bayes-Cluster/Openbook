/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: process.env.DOCKER_BUILD === 'true' ? '/frontend' : '../',
  },
}

module.exports = nextConfig
