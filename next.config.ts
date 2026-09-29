import type { NextConfig } from "next";

// GitHub Pages project site: https://<user>.github.io/<repo>/
// CI sets BASE_PATH=/<repo-name>. Leave empty for local / custom domain root.
const basePath = process.env.BASE_PATH?.replace(/\/$/, "") || "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
