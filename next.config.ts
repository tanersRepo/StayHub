import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let the dev server be opened from other devices. Next blocks dev assets (and live reload)
  // requested from any hostname it wasn't started with, matched against the address the browser
  // is pointed at (not the device's own IP), so every device using one address is covered.
  // Next refuses a catch-all ("**", "*.com") on purpose, so common hosts are listed:
  allowedDevOrigins: [
    // Public tunnels, for devices on any network: VS Code port forwarding, ngrok, Cloudflare, localtunnel.
    "**.devtunnels.ms",
    "**.ngrok-free.app",
    "**.ngrok-free.dev",
    "**.ngrok.app",
    "**.ngrok.dev",
    "**.ngrok.io",
    "**.trycloudflare.com",
    "**.loca.lt",
    // Private networks (this computer's address on home or office Wi-Fi, e.g. http://192.168.50.137:3000).
    "192.168.*.*",
    "10.*.*.*",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      // Real listing photos in the seed data (prisma/seed-featured.ts).
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
