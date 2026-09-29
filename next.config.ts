import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Cloud Agent / browser testing via 127.0.0.1 (hydration + HMR)
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
