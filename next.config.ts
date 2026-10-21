import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "scsqznvtzmixigdjudje.supabase.co";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/avatars/**",
      },
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/images/**",
      },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/a/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/a-/**" },
    ],
  },
  // Old roast-mode URLs; temporary (307), and the query string is passed through
  async redirects() {
    return [{ source: "/roast/new", destination: "/new", permanent: false }];
  },
};

export default nextConfig;
