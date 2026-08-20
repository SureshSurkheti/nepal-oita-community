import type { NextConfig } from 'next'

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined

const nextConfig: NextConfig = {
  /* Next blocks dev-only chunks from any origin but the one you started on, so
     loading http://127.0.0.1:3000 serves the HTML but silently refuses the
     client JavaScript — the page renders and never hydrates. Allowing it keeps
     `localhost` and `127.0.0.1` behaving the same, which is worth it: the
     difference cost an afternoon of chasing a hydration bug that was not there. */
  allowedDevOrigins: ['127.0.0.1'],

  images: {
    // Member portraits and gallery photographs are served from Supabase
    // Storage, so next/image has to be told that host is allowed.
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
      : [],
  },
}

export default nextConfig
