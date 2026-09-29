import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev hydration/HMR when opened via 127.0.0.1 (Cloud Agent / browsers)
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
