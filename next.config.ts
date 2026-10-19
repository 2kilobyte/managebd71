import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['discord.js'],
  /* config options here */
  images: {
    domains: ['i.postimg.cc', 'i.ibb.co']
  }
};

export default nextConfig;
