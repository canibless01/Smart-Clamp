/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: false },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Referrer-Policy', value: 'no-referrer' }
      ]
    }]
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:5000/api/v1/:path*' }
    ]
  }
}
module.exports = nextConfig
