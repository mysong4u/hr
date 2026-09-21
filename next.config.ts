import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  allowedDevOrigins: [
    '192.168.10.122',
    'localhost:3000',
    '*.loca.lt',
    '*.ngrok-free.app',
    '*.pinggy.online',
    '*.pinggy.link',
    '*.pinggy.net',
    '*.pinggy-free.link',
    '*.run.pinggy-free.link',
    '*.free.pinggy.net',
    'wpivw-210-126-2-137.run.pinggy-free.link'
  ],
};

export default nextConfig;
