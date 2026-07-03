import type { NextConfig } from "next";

// PORTABLE=true -> static export served at root (run anywhere with a static server).
// EXPORT=true   -> static export under a subpath (homelab nginx deploy).
//                  EXPORT_BASE overrides the subpath (default /credits).
const portable = process.env.PORTABLE === "true";
const isExport = process.env.EXPORT === "true" || portable;
const exportBase = process.env.EXPORT_BASE || "/credits";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  ...(isExport && {
    output: "export",
    images: { unoptimized: true },
    trailingSlash: true,
    // basePath only for the VM subpath; the portable build serves from root
    ...(portable ? {} : { basePath: exportBase }),
  }),
};

export default nextConfig;
