import type { NextConfig } from "next";

// PORTABLE=true -> static export served at root (run anywhere with a static server).
// EXPORT=true   -> static export under /credits (homelab nginx subpath deploy).
const portable = process.env.PORTABLE === "true";
const isExport = process.env.EXPORT === "true" || portable;

const nextConfig: NextConfig = {
  reactStrictMode: false,
  ...(isExport && {
    output: "export",
    images: { unoptimized: true },
    trailingSlash: true,
    // basePath only for the VM subpath; the portable build serves from root
    ...(portable ? {} : { basePath: "/credits" }),
  }),
};

export default nextConfig;
