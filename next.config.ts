import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Photos are compressed client-side and served straight from Vercel Blob,
  // so we skip Vercel Image Optimization (keeps us inside Hobby quotas).
  images: { unoptimized: true },
  serverExternalPackages: ["pg"],
  turbopack: {
    rules: {
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
