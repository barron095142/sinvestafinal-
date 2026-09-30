import type { NextConfig } from "next";
import { BASE_PATH } from "./src/lib/constants";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
];

const nextConfig: NextConfig = {
  // The public site proxies /admin/* to this app, so every route, asset and
  // API lives under /admin on the real domain.
  basePath: BASE_PATH,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Keep the portal out of search results. Media is excluded because the
      // public site embeds uploaded images.
      {
        source: "/((?!api/media/).*)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
};

export default nextConfig;
