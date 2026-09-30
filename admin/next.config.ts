import type { NextConfig } from "next";
import { BASE_PATH } from "./src/lib/constants";

/**
 * Built as plain static files (out/) and uploaded to Bluehost under
 * public_html/admin. All data comes from the PHP API at /admin/api/*;
 * security headers and noindex are set in the Apache .htaccess.
 */
const nextConfig: NextConfig = {
  output: "export",
  basePath: BASE_PATH,
  trailingSlash: true, // admin/settings/index.html, served by Apache as /admin/settings/
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
