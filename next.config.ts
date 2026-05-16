import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

// Allow external connections to the dev server
module.exports = {
  allowedDevOrigins: ['192.168.1.56'],
}

export default nextConfig;
