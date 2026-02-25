import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: ["192.168.0.77:3000", "localhost:3000"],
      bodySizeLimit: "50mb",
    },
  },
  serverExternalPackages: ["pdf-parse", "@ffmpeg/ffmpeg", "@ffmpeg/core", "@ffmpeg-installer/ffmpeg"],
};

export default nextConfig;
