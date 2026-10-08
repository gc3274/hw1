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
};

export default nextConfig;
