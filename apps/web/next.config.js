/** @type {import('next').NextConfig} */
const apiTarget = process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_PROXY_TARGET || 'http://localhost:5000'

const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: false },
  async headers() {
    return [{source:'/sw.js',headers:[{key:'Cache-Control',value:'no-cache'},{key:'Service-Worker-Allowed',value:'/'}]},...['/communications','/login','/signup','/account','/auth','/reports','/meters','/dashboard','/ops','/admin','/settings','/devices','/billing','/history','/control','/alerts','/portal','/orders','/disputes','/payments','/join','/support/tickets','/d','/verification-reports','/api'].map(prefix => ({source: `${prefix}/:path*`,headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'},{key:'Cache-Control',value:'no-store'}]})),{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
      ]
    }]
  },
  async rewrites() {
    // In production you can set NEXT_PUBLIC_API_BASE to absolute URL and skip rewrites.
    // For local dev, /api/* proxies to Flask to avoid CORS issues.
    // API spec is served at /api/v1/*, so rewrite /api/* -> target/api/* or target/api/v1/*
    // Our Flask serves at /api/v1/*, so map /api/:path* -> target/api/v1/:path* and /api/v1/:path* -> same
    return [
      { source: '/api/v1/:path*', destination: `${apiTarget}/api/v1/:path*` },
      { source: '/api/:path*', destination: `${apiTarget}/api/:path*` },
    ]
  },
  // Allow images from Supabase storage / fallback
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
}
module.exports = nextConfig
