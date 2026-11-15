import type { NextConfig } from "next";

const pages = process.env.GITHUB_PAGES === "true";
const nextConfig: NextConfig = {
  ...(pages ? { output: "export", basePath: "/aquehorajuegaboca", assetPrefix: "/aquehorajuegaboca/" } : {}),
};
export default nextConfig;
