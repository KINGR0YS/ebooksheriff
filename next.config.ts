import type { NextConfig } from "next";

// Populate standard local network IPs to avoid webpack-hmr origin blocking
const allowedDevOrigins: string[] = ['localhost:3000'];
for (let i = 1; i <= 254; i++) {
  allowedDevOrigins.push(`192.168.1.${i}:3000`);
  allowedDevOrigins.push(`192.168.1.${i}`);
  allowedDevOrigins.push(`192.168.0.${i}:3000`);
  allowedDevOrigins.push(`192.168.0.${i}`);
  allowedDevOrigins.push(`10.0.0.${i}:3000`);
  allowedDevOrigins.push(`10.0.0.${i}`);
}

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export default nextConfig;
