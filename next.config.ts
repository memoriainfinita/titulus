import type { NextConfig } from "next";

// EXPORT=true -> static export under /titulus (GitHub Pages project site).
// Plain `next dev` / `next build` are unaffected.
const isExport = process.env.EXPORT === "true";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  ...(isExport && {
    output: "export",
    images: { unoptimized: true },
    trailingSlash: true,
    basePath: "/titulus",
  }),
};

export default nextConfig;
