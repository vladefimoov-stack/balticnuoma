import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** Supabase Storage origin for next/image (https in production, http for the local CLI stack). */
const supabaseOrigin = (() => {
  try {
    const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    if (!raw) return null;
    const url = new URL(raw);
    return { protocol: url.protocol.replace(":", "") as "http" | "https", hostname: url.hostname, port: url.port };
  } catch {
    return null;
  }
})();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Gyroscope is used by the hero scene on mobile (with user permission).
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), gyroscope=(self), accelerometer=(self)",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseOrigin ? [{ ...supabaseOrigin, pathname: "/storage/v1/object/public/**" }] : [],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/models/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/brand/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
