/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_ENGINE_URL: process.env.NEXT_PUBLIC_ENGINE_URL || 'http://localhost:11110',
    // Cloudflare Turnstile sitekey. Empty by default: the signup page then
    // renders no widget and posts no turnstileToken, and the engine's dev
    // verifier (TURNSTILE_SECRET unset) accepts the request unchanged.
    NEXT_PUBLIC_TURNSTILE_SITEKEY: process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY || '',
    // Color convention flag: 'green-up' (Western, default) or 'red-up'
    // (Indonesian/Chinese). Drives up/down color variables across price,
    // book, tape, chart, and P&L. See CONTEXT.md — Color convention.
    NEXT_PUBLIC_COLOR_CONVENTION: process.env.NEXT_PUBLIC_COLOR_CONVENTION || 'green-up',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // Server-side proxy to the backend API on port 11110
        destination: `${process.env.ENGINE_REWRITE_URL || 'http://localhost:11110'}/api/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      // Spec journey step 4 lands on /dashboard; the default dashboard view
      // is the Marketplace (left nav item 1).
      { source: '/dashboard', destination: '/dashboard/marketplace', permanent: false },
    ];
  },
};

module.exports = nextConfig;
